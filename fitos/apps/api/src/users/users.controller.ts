import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { MacroTargets } from '@fitos/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.usersService.getMe(req.user.userId);
  }

  @Get('me/goals')
  getGoals(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<MacroTargets> {
    return this.usersService.getActiveGoals(req.user.userId);
  }
}
