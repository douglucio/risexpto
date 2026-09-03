import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ProfileController } from './profile/profile.controller';
import { UsersModule } from './users/users.module';
import { createDatabaseClient } from '@risexpto/database';

const database = createDatabaseClient(
  process.env.DATABASE_URL ?? 'postgresql://invalid:invalid@localhost:5432/invalid',
);

@Module({
  imports: [UsersModule.withDatabase(database), AuthModule],
  controllers: [AppController, ProfileController],
})
export class AppModule {}
