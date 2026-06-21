import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { TdeeModule } from './tdee/tdee.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CoachModule } from './coach/coach.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    TdeeModule,
    OnboardingModule,
    UsersModule,
    WorkoutsModule,
    NutritionModule,
    DashboardModule,
    CoachModule,
  ],
})
export class AppModule {}
