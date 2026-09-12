import { Controller, Get } from '@nestjs/common';
import { cryptoDigitalTraders } from '@risexpto/digital-traders';

@Controller('traders')
export class TradersController {
  @Get()
  list() {
    return cryptoDigitalTraders;
  }
}
