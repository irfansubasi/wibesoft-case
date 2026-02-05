import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, AdminSeedService],
  exports: [UsersService],
})
export class UsersModule {}
