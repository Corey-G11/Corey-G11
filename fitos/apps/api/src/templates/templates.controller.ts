import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  AdoptedProgram,
  ProgramTemplate,
  TemplatesService,
} from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(): ProgramTemplate[] {
    return this.templatesService.listTemplates();
  }

  @Get(':id')
  getOne(@Param('id') id: string): ProgramTemplate {
    return this.templatesService.getTemplate(id);
  }

  @Post(':id/adopt')
  adopt(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('id') id: string,
  ): Promise<AdoptedProgram> {
    return this.templatesService.adopt(req.user.userId, id);
  }
}
