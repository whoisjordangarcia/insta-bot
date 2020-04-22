import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotService } from './bot.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log'],
  });
  //await app.listen(3000);
  const tasksService = app.select(AppModule).get(BotService, { strict: true });
  tasksService.start();
}
bootstrap();
