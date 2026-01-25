import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('RESEND_API_KEY');
    
    if (!apiKey) {
      this.logger.error('⚠️ RESEND_API_KEY is not set! Email sending will fail.');
    } else {
      this.logger.log(`Resend API Key configured: ${apiKey.substring(0, 8)}...`);
    }

    this.resend = new Resend(apiKey);
    
    // Set default sender - use your verified domain or onboarding@resend.dev for testing
    this.fromEmail = this.configService.get('MAIL_SENDER_DEFAULT') || 'onboarding@resend.dev';
    this.fromName = this.configService.get('MAIL_SENDER_NAME_DEFAULT') || 'HandieHub';
  }

  async onModuleInit() {
    // Test the API key on startup
    const apiKey = this.configService.get('RESEND_API_KEY');
    if (apiKey) {
      this.logger.log('✅ Resend email service initialized');
      this.logger.log(`   From: ${this.fromName} <${this.fromEmail}>`);
    } else {
      this.logger.error('❌ Resend not configured - RESEND_API_KEY missing');
    }
  }

  async sendEmail(data: SendEmailDto): Promise<{ success: boolean } | null> {
    const { sender, recipients, subject, html, text } = data;

    // Build the "from" address
    const fromAddress = sender 
      ? `${sender.name} <${sender.address}>`
      : `${this.fromName} <${this.fromEmail}>`;

    // Convert recipients to email strings
    const toAddresses = recipients.map(r => 
      typeof r === 'string' ? r : r.address
    );

    this.logger.log(`Attempting to send email to: ${toAddresses.join(', ')}`);

    try {
      const { data: result, error } = await this.resend.emails.send({
        from: fromAddress,
        to: toAddresses,
        subject,
        html,
        text,
      });

      if (error) {
        this.logger.error('❌ Resend error:', error.message);
        this.logger.error('Error details:', JSON.stringify(error, null, 2));
        
        if (error.message?.includes('API key')) {
          this.logger.error('🔑 Check your RESEND_API_KEY is correct');
        } else if (error.message?.includes('domain')) {
          this.logger.error('🌐 Domain not verified. Use onboarding@resend.dev for testing');
        }
        
        return null;
      }

      this.logger.log(`✅ Email sent successfully! ID: ${result?.id}`);
      return { success: true };
    } catch (error) {
      this.logger.error('❌ Email sending failed:', error.message);
      return null;
    }
  }
}
