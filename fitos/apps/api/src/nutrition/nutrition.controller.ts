import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateFoodDto } from './dto/create-food.dto';
import { CreateLogDto } from './dto/create-log.dto';
import { DayQueryDto } from './dto/day-query.dto';
import { SearchFoodsDto } from './dto/search-foods.dto';
import {
  DaySummary,
  Food,
  NutritionLog,
  NutritionService,
} from './nutrition.service';

type AuthRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('foods')
  searchFoods(@Query() query: SearchFoodsDto): Promise<Food[]> {
    return this.nutritionService.searchFoods(query.query);
  }

  @Post('foods')
  createFood(@Body() dto: CreateFoodDto): Promise<Food> {
    return this.nutritionService.createFood(dto);
  }

  @Post('nutrition/logs')
  createLog(
    @Req() req: AuthRequest,
    @Body() dto: CreateLogDto,
  ): Promise<NutritionLog> {
    return this.nutritionService.createLog(req.user.userId, dto);
  }

  @Get('nutrition/logs')
  listLogs(
    @Req() req: AuthRequest,
    @Query() query: DayQueryDto,
  ): Promise<NutritionLog[]> {
    return this.nutritionService.listLogs(req.user.userId, query.date);
  }

  @Delete('nutrition/logs/:id')
  @HttpCode(204)
  async deleteLog(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.nutritionService.deleteLog(req.user.userId, id);
  }

  @Get('nutrition/summary')
  getSummary(
    @Req() req: AuthRequest,
    @Query() query: DayQueryDto,
  ): Promise<DaySummary> {
    return this.nutritionService.getSummary(req.user.userId, query.date);
  }
}
