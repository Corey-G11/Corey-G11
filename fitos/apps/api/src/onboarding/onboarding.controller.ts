import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { MacroTargets } from '@fitos/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { OnboardingService } from './onboarding.service';
import { OnboardingDto } from './dto/onboarding.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: OnboardingDto,
  ): Promise<MacroTargets> {
    return this.onboardingService.completeOnboarding(req.user.userId, dto);
  }
}
