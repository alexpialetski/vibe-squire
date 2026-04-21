import { Controller, Post } from '@nestjs/common';
import { ReinitService } from './reinit.service';

@Controller('api/reinit')
export class ReinitController {
  constructor(private readonly reinit: ReinitService) {}

  @Post()
  run() {
    return this.reinit.reinitialize();
  }
}
