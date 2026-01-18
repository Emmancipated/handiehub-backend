import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
    @IsEnum(['credit', 'debit'])
    @IsNotEmpty()
    type: 'credit' | 'debit';

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(['payment', 'refund', 'withdrawal', 'deposit', 'service_fee'])
    @IsNotEmpty()
    category: 'payment' | 'refund' | 'withdrawal' | 'deposit' | 'service_fee';

    @IsString()
    @IsNotEmpty()
    reference: string;

    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsOptional()
    orderId?: string;

    @IsOptional()
    metadata?: Record<string, any>;
}
