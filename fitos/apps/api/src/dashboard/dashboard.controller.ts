import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  Biometric,
  CreateBiometricInput,
  DashboardService,
  DashboardSnapshot,
} from './dashboard.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getDashboard(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<DashboardSnapshot> {
    return this.dashboardService.getSnapshot(req.user.userId);
  }

  @Post('biometrics')
  createBiometric(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() body: CreateBiometricInput,
  ): Promise<Biometric> {
    const weightKg = Number(body?.weightKg);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      throw new BadRequestException('weightKg must be a positive number');
    }
    return this.dashboardService.createBiometric(req.user.userId, {
      weightKg,
      bodyFatPercentage: numOrUndefined(body?.bodyFatPercentage),
      restingHeartRate: numOrUndefined(body?.restingHeartRate),
      sleepDurationMinutes: numOrUndefined(body?.sleepDurationMinutes),
    });
  }

  @Get('biometrics')
  getBiometrics(
    @Req() req: Request & { user: AuthenticatedUser },
    @Query('limit') limit?: string,
  ): Promise<Biometric[]> {
    const parsed = limit !== undefined ? Number(limit) : undefined;
    return this.dashboardService.getBiometrics(
      req.user.userId,
      parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
    );
  }
}

function numOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
