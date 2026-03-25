import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { GhCliService } from './gh-cli.service';

@Module({
  imports: [SettingsModule],
  providers: [GhCliService],
  exports: [GhCliService],
})
export class GhModule {}
