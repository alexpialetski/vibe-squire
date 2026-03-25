import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Redirect('/ui/dashboard', 302)
  root(): void {
    void 0;
  }
}
