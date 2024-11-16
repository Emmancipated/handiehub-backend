// user.controller.ts

import { Post, Query } from '@nestjs/common';
import { VerificationService } from './verification.service';

export class VerificationController {
  constructor(private verificationService: VerificationService) {}
  @Post('verify')
  async verifyUser(@Query('token') token: string) {
    return this.verificationService.verifyToken(token);
  }
}
