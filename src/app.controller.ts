import { Controller, Get } from '@nestjs/common';

import { BotService } from './bot.service';

@Controller()
export class AppController {
  constructor(private readonly botService: BotService) {}

  @Get()
  async getStartBot(): Promise<string> {
    console.log('Starting Bot....')
    return await this.botService.start()
  }
}
