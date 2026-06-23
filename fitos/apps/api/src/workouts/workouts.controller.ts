import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateLogDto } from './dto/create-log.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { CreateSetDto } from './dto/create-set.dto';
import { ListExercisesDto } from './dto/list-exercises.dto';
import { UpdateLogDto } from './dto/update-log.dto';
import {
  Exercise,
  ExerciseLog,
  Program,
  WorkoutLog,
  WorkoutsService,
} from './workouts.service';

type AuthedRequest = Request & { user: AuthenticatedUser };

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get('exercises')
  listExercises(@Query() query: ListExercisesDto): Promise<Exercise[]> {
    return this.workoutsService.listExercises(query.muscle);
  }

  @Post('workouts/programs')
  createProgram(
    @Req() req: AuthedRequest,
    @Body() dto: CreateProgramDto,
  ): Promise<Program> {
    return this.workoutsService.createProgram(req.user.userId, dto);
  }

  @Get('workouts/programs')
  listPrograms(@Req() req: AuthedRequest): Promise<Program[]> {
    return this.workoutsService.listPrograms(req.user.userId);
  }

  @Post('workouts/logs')
  createLog(
    @Req() req: AuthedRequest,
    @Body() dto: CreateLogDto,
  ): Promise<WorkoutLog> {
    return this.workoutsService.createLog(req.user.userId, dto);
  }

  @Get('workouts/logs')
  listLogs(@Req() req: AuthedRequest): Promise<WorkoutLog[]> {
    return this.workoutsService.listLogs(req.user.userId);
  }

  @Get('workouts/logs/:id')
  getLog(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutLog & { exercise_logs: ExerciseLog[] }> {
    return this.workoutsService.getLog(req.user.userId, id);
  }

  @Post('workouts/logs/:id/sets')
  addSet(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSetDto,
  ): Promise<ExerciseLog> {
    return this.workoutsService.addSet(req.user.userId, id, dto);
  }

  @Patch('workouts/logs/:id')
  updateLog(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLogDto,
  ): Promise<WorkoutLog> {
    return this.workoutsService.updateLog(req.user.userId, id, dto);
  }
}
