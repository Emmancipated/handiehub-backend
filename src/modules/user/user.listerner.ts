import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { User } from './schemas/user.schema';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class UserListener {
    constructor(private readonly verificationService: VerificationService) { }

    @OnEvent('user.created')
    async handleUserCreatedEvent(user: User) {
        // This runs in the background. If the email service is slow,
        // the user doesn't have to wait to see the "Success" screen.
        await this.verificationService.sendOtp(user);
    }
}