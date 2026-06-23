import { Module } from '@nestjs/common';
import { TdeeModule } from '../tdee/tdee.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TdeeModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
