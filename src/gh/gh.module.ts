import { Module } from '@nestjs/common';
import { GhCliService } from './gh-cli.service';

@Module({
  imports: [],
  providers: [GhCliService],
  exports: [GhCliService],
})
export class GhModule {}
