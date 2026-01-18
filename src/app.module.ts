import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { AiModule } from './ai/ai.module';
import { PaymentModule } from './payment/payment.module';
import { ChatModule } from './chat/chat.module';
import { FileModule } from './file/file.module';
import { ScreenshareModule } from './screenshare/screenshare.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    AuthModule,
    UserModule,
    TaskModule,
    AiModule,
    PaymentModule,
    ChatModule,
    FileModule,
    ScreenshareModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
