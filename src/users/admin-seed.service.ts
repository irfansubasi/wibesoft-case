import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');
    let name = this.configService.get<string>('ADMIN_NAME') ?? 'Admin';

    if (!email?.trim() || !password?.trim()) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in .env');
    }
    name = name?.trim() || 'Admin';

    const existingAdmin = await this.userRepository.findOne({
      where: { role: 'ADMIN' },
    });
    if (existingAdmin) {
      return;
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: email.trim() },
    });

    if (existingUser) {
      existingUser.role = 'ADMIN';
      await this.userRepository.save(existingUser);
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = this.userRepository.create({
      email: email.trim(),
      passwordHash,
      name: name,
      role: 'ADMIN',
    });
    await this.userRepository.save(user);
  }
}
