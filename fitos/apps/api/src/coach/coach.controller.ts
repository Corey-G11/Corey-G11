import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CoachService, Feedback, Recommendation } from './coach.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get('recommendations')
  list(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<Recommendation[]> {
    return this.coachService.list(req.user.userId);
  }

  @Post('recommendations/generate')
  generate(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<Recommendation> {
    return this.coachService.generate(req.user.userId);
  }

  @Patch('recommendations/:id/acknowledge')
  acknowledge(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id') id: string,
  ): Promise<Recommendation> {
    return this.coachService.acknowledge(req.user.userId, id);
  }

  @Post('recommendations/:id/feedback')
  submitFeedback(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<Feedback> {
    return this.coachService.submitFeedback(req.user.userId, id, dto);
  }

  @Get('recommendations/:id/feedback')
  listFeedback(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id') id: string,
  ): Promise<Feedback[]> {
    return this.coachService.listFeedback(req.user.userId, id);
  }
}
