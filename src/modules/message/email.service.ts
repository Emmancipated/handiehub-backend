import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SendEmailDto } from './dto/send-email.dto';

export interface OrderEmailData {
  orderNumber: string;
  productName: string;
  productImage?: string;
  quantity: number;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerEmail: string;
  deliveryDate?: string;
  orderDate: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;

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
    this.appUrl = this.configService.get('APP_URL') || 'https://handiehub.com';
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

  // ==================== Order Email Templates ====================

  /**
   * Send order confirmation email to buyer
   */
  async sendOrderConfirmationToBuyer(data: OrderEmailData): Promise<void> {
    const html = this.generateBuyerOrderEmailTemplate(data);
    
    try {
      await this.sendEmail({
        recipients: [{ address: data.buyerEmail, name: data.buyerName }],
        subject: `Order Confirmed - #${data.orderNumber}`,
        html,
        text: `Your order #${data.orderNumber} for ${data.productName} has been placed successfully. Total: ₦${data.amount.toLocaleString()}`,
      });
      this.logger.log(`Order confirmation email sent to buyer: ${data.buyerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send order email to buyer: ${error.message}`);
    }
  }

  /**
   * Send new order notification email to seller
   */
  async sendNewOrderToSeller(data: OrderEmailData): Promise<void> {
    const html = this.generateSellerOrderEmailTemplate(data);
    
    try {
      await this.sendEmail({
        recipients: [{ address: data.sellerEmail, name: data.sellerName }],
        subject: `New Order Received - #${data.orderNumber}`,
        html,
        text: `You have a new order #${data.orderNumber} for ${data.productName}. Amount: ₦${data.amount.toLocaleString()}. Please process it soon.`,
      });
      this.logger.log(`New order email sent to seller: ${data.sellerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send order email to seller: ${error.message}`);
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(
    email: string,
    name: string,
    orderNumber: string,
    status: string,
    productName: string,
  ): Promise<void> {
    const statusMessages: Record<string, { title: string; message: string; color: string }> = {
      confirmed: {
        title: 'Order Confirmed',
        message: 'Great news! Your order has been confirmed by the seller and is being prepared.',
        color: '#10b981',
      },
      shipped: {
        title: 'Order Shipped',
        message: 'Your order is on its way! Track your package for delivery updates.',
        color: '#3b82f6',
      },
      delivered: {
        title: 'Order Delivered',
        message: 'Your order has been delivered. We hope you enjoy your purchase!',
        color: '#10b981',
      },
      completed: {
        title: 'Order Completed',
        message: 'Thank you for shopping with HandieHub! Your order is now complete.',
        color: '#10b981',
      },
      cancelled: {
        title: 'Order Cancelled',
        message: 'Your order has been cancelled. If you paid, a refund will be processed.',
        color: '#ef4444',
      },
    };

    const statusInfo = statusMessages[status] || {
      title: 'Order Updated',
      message: `Your order status has been updated to: ${status}`,
      color: '#6366f1',
    };

    const html = this.generateStatusUpdateEmailTemplate(orderNumber, productName, statusInfo);
    
    try {
      await this.sendEmail({
        recipients: [{ address: email, name }],
        subject: `${statusInfo.title} - Order #${orderNumber}`,
        html,
        text: `${statusInfo.title}: ${statusInfo.message}`,
      });
      this.logger.log(`Order status email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send status email: ${error.message}`);
    }
  }

  // ==================== Email Template Generators ====================

  private getBaseEmailStyles(): string {
    return `
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
      .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; }
      .content { padding: 30px; }
      .greeting { font-size: 18px; color: #1f2937; margin-bottom: 20px; }
      .order-box { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
      .order-number { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
      .order-number span { font-weight: 600; color: #6366f1; }
      .product-row { display: flex; align-items: center; gap: 15px; margin: 15px 0; }
      .product-image { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background-color: #e5e7eb; }
      .product-info { flex: 1; }
      .product-name { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0; }
      .product-qty { font-size: 14px; color: #6b7280; margin: 0; }
      .divider { height: 1px; background-color: #e5e7eb; margin: 15px 0; }
      .total-row { display: flex; justify-content: space-between; align-items: center; }
      .total-label { font-size: 14px; color: #6b7280; }
      .total-amount { font-size: 24px; font-weight: 700; color: #1f2937; }
      .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 20px 0; }
      .info-text { font-size: 14px; color: #6b7280; line-height: 1.6; }
      .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
      .footer p { font-size: 12px; color: #9ca3af; margin: 4px 0; }
      .footer a { color: #6366f1; text-decoration: none; }
      .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    `;
  }

  private generateBuyerOrderEmailTemplate(data: OrderEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <style>${this.getBaseEmailStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛍️ Order Confirmed!</h1>
      <p>Thank you for your purchase</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.buyerName},</p>
      <p class="info-text">Great news! Your order has been successfully placed and the seller has been notified. Here are your order details:</p>
      
      <div class="order-box">
        <p class="order-number">Order Number: <span>#${data.orderNumber}</span></p>
        <p class="order-number">Order Date: <span>${data.orderDate}</span></p>
        
        <div class="divider"></div>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="80" style="padding-right: 15px;">
              ${data.productImage 
                ? `<img src="${data.productImage}" alt="${data.productName}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">` 
                : `<div style="width: 80px; height: 80px; border-radius: 8px; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center;">📦</div>`
              }
            </td>
            <td>
              <p style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;">${data.productName}</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">Quantity: ${data.quantity}</p>
              <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">Seller: ${data.sellerName}</p>
            </td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 14px; color: #6b7280;">Total Paid</td>
            <td align="right" style="font-size: 24px; font-weight: 700; color: #1f2937;">₦${data.amount.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <p class="info-text">The seller will process your order soon. You'll receive updates as your order progresses.</p>
      
      <center>
        <a href="${this.appUrl}" class="cta-button">Track Your Order</a>
      </center>
      
      <p class="info-text" style="margin-top: 20px;">If you have any questions about your order, please don't hesitate to contact us.</p>
    </div>
    
    <div class="footer">
      <p><strong>HandieHub</strong></p>
      <p>Your trusted marketplace for products and services</p>
      <p style="margin-top: 10px;"><a href="${this.appUrl}">Visit HandieHub</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateSellerOrderEmailTemplate(data: OrderEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
  <style>${this.getBaseEmailStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <h1>🎉 New Order Received!</h1>
      <p>You have a new sale</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.sellerName},</p>
      <p class="info-text">Congratulations! You've received a new order. Please process it as soon as possible to keep your customer happy.</p>
      
      <div class="order-box">
        <p class="order-number">Order Number: <span>#${data.orderNumber}</span></p>
        <p class="order-number">Order Date: <span>${data.orderDate}</span></p>
        
        <div class="divider"></div>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="80" style="padding-right: 15px;">
              ${data.productImage 
                ? `<img src="${data.productImage}" alt="${data.productName}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">` 
                : `<div style="width: 80px; height: 80px; border-radius: 8px; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center;">📦</div>`
              }
            </td>
            <td>
              <p style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 4px 0;">${data.productName}</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">Quantity: ${data.quantity}</p>
            </td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px 0;">Customer</p>
              <p style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0;">${data.buyerName}</p>
            </td>
            <td align="right">
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px 0;">Order Amount</p>
              <p style="font-size: 24px; font-weight: 700; color: #10b981; margin: 0;">₦${data.amount.toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="font-size: 14px; color: #92400e; margin: 0;"><strong>⏰ Action Required:</strong> Please confirm and process this order promptly to maintain your seller rating.</p>
      </div>
      
      <center>
        <a href="${this.appUrl}" class="cta-button" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">View Order Details</a>
      </center>
      
      <p class="info-text" style="margin-top: 20px;">The payment is held in escrow and will be released to your wallet 5 days after the order is marked as completed.</p>
    </div>
    
    <div class="footer">
      <p><strong>HandieHub Seller Dashboard</strong></p>
      <p>Manage your orders and grow your business</p>
      <p style="margin-top: 10px;"><a href="${this.appUrl}">Go to Dashboard</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateStatusUpdateEmailTemplate(
    orderNumber: string,
    productName: string,
    statusInfo: { title: string; message: string; color: string },
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.title}</title>
  <style>${this.getBaseEmailStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: ${statusInfo.color};">
      <h1>${statusInfo.title}</h1>
      <p>Order #${orderNumber}</p>
    </div>
    
    <div class="content">
      <div class="order-box" style="text-align: center;">
        <span class="status-badge" style="background-color: ${statusInfo.color}20; color: ${statusInfo.color};">${statusInfo.title}</span>
        <p style="font-size: 16px; color: #1f2937; margin: 20px 0 10px 0;"><strong>${productName}</strong></p>
        <p class="info-text">${statusInfo.message}</p>
      </div>
      
      <center>
        <a href="${this.appUrl}" class="cta-button">View Order</a>
      </center>
    </div>
    
    <div class="footer">
      <p><strong>HandieHub</strong></p>
      <p>Your trusted marketplace for products and services</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
