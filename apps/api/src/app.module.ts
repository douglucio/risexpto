import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ProfileController } from './profile/profile.controller';

@Module({ imports: [AuthModule], controllers: [AppController, ProfileController] })
export class AppModule {}
