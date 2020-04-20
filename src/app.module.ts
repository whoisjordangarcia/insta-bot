import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { BotService } from './bot.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [BotService],
})
export class AppModule {}
