import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, SendMailOptions, Transporter } from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private mailTransport: Transporter;

  constructor(private configService: ConfigService) {
    this.mailTransport = createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: Number(this.configService.get('MAIL_PORT')),
      secure: false, // TODO: upgrade later with STARTTLS
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(data: SendEmailDto): Promise<{ success: boolean } | null> {
    const { sender, recipients, subject, html, text } = data;
    // const url = `http://your-frontend-app/verify-email?token=${token}`;
    console.log('Send mail was called');

    // const mailOptions: SendMailOptions = {
    //   from: sender ?? {
    //     name: this.configService.get('MAIL_SENDER_NAME_DEFAULT'),
    //     address: this.configService.get('MAIL_SENDER_DEFAULT'),
    //   },
    //   to: recipients,
    //   subject,
    //   html, // valid HTML body
    //   text, // plain text body
    // };

    const mailOptions: SendMailOptions = {
      from: sender ?? {
        name: this.configService.get('MAIL_SENDER_NAME_DEFAULT'),
        address: this.configService.get('MAIL_SENDER_DEFAULT'),
      },
      replyTo: 'reply-to@example.com', // Reply-to address
      to: recipients, // Recipient email address(es)
      date: new Date(), // Optional: set a custom date
      subject, // Email subject
      html, // HTML message body
      text, // Plain text body (optional)

      // Optional: add `mailed-by` and `signed-by` using custom headers
      headers: {
        'mailed-by': this.configService.get('MAIL_HOST'),
        'signed-by': this.configService.get('MAIL_SENDER_DEFAULT'),
      },

      // Optional: add an unsubscribe link header
      list: {
        unsubscribe: [
          {
            url: 'https://yourapp.com/unsubscribe?email=recipient@example.com',
            comment: 'Unsubscribe from these emails',
          },
        ],
      },
    };
    try {
      await this.mailTransport.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      // handle error
      return null;
    }
  }
}
