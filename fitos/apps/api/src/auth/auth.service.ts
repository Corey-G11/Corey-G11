import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import type { AuthResponse } from '@fitos/shared';
import { PG_POOL } from '../db/db.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [dto.email, passwordHash],
      );
      const userId = userResult.rows[0].id;

      // Stub profile row; onboarding fills in real values later.
      await client.query(
        `INSERT INTO profiles (user_id, first_name, date_of_birth, height_cm)
         VALUES ($1, $2, $3, $4)`,
        [userId, dto.firstName, '2000-01-01', 0],
      );

      await client.query('COMMIT');

      const accessToken = this.generateToken(userId, dto.email);
      return { accessToken, userId };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const result = await this.pool.query<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [dto.email],
    );

    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user.id, dto.email);
    return { accessToken, userId: user.id };
  }

  generateToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: '7d' },
    );
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === '23505'
    );
  }
}
