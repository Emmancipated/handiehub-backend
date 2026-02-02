import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { User } from './schemas/user.schema';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class UserListener {
    private readonly logger = new Logger(UserListener.name);

    constructor(private readonly verificationService: VerificationService) { }

    @OnEvent('user.created', { async: true })  // async: true makes this non-blocking!
    async handleUserCreatedEvent(user: User) {
        // This now truly runs in the background. The user sees "Success" immediately
        // while the email is being sent asynchronously.
        try {
            this.logger.log(`Sending verification email to: ${user.email}`);
            await this.verificationService.sendOtp(user);
            this.logger.log(`Verification email sent to: ${user.email}`);
        } catch (error) {
            // Log error but don't crash - user is already created
            this.logger.error(`Failed to send verification email to ${user.email}:`, error.message);
        }
    }
}