import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';
import { createMockPool, ScriptedResult } from './helpers/mock-pool';

function makeService(script: ScriptedResult[]) {
  const mock = createMockPool(script);
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '7d' },
  });
  const service = new AuthService(mock.pool, jwt);
  return { service, mock, jwt };
}

describe('AuthService (integration, mocked pool)', () => {
  it('register hashes the password, inserts user + profile, returns a valid token', async () => {
    const { service, mock, jwt } = makeService([
      { rows: [{ id: 'user-1' }] }, // INSERT users RETURNING id
      { rows: [] }, // INSERT profiles
    ]);

    const res = await service.register({
      email: 'a@b.com',
      password: 'Password1',
      firstName: 'Al',
    });

    expect(res.userId).toBe('user-1');
    const decoded = jwt.verify<{ sub: string; email: string }>(res.accessToken);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('a@b.com');

    const usersInsert = mock.calls.find((c) => c.text.includes('INSERT INTO users'));
    expect(usersInsert).toBeDefined();
    expect(usersInsert?.params[0]).toBe('a@b.com');
    // Stored value is a bcrypt hash of the plaintext, not the plaintext itself.
    const hash = usersInsert?.params[1] as string;
    expect(hash).not.toBe('Password1');
    expect(await bcrypt.compare('Password1', hash)).toBe(true);
  });

  it('register throws ConflictException on a unique-violation (23505)', async () => {
    const { service } = makeService([{ error: { code: '23505' } }]);
    await expect(
      service.register({ email: 'dup@b.com', password: 'Password1', firstName: 'Al' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login returns a token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('Password1', 4);
    const { service } = makeService([
      { rows: [{ id: 'user-1', password_hash: passwordHash }] },
    ]);

    const res = await service.login({ email: 'a@b.com', password: 'Password1' });
    expect(res.userId).toBe('user-1');
    expect(typeof res.accessToken).toBe('string');
  });

  it('login rejects a wrong password', async () => {
    const passwordHash = await bcrypt.hash('Password1', 4);
    const { service } = makeService([
      { rows: [{ id: 'user-1', password_hash: passwordHash }] },
    ]);
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rejects an unknown email', async () => {
    const { service } = makeService([{ rows: [] }]);
    await expect(
      service.login({ email: 'missing@b.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
