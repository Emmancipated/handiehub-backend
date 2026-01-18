import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
    @IsEnum(['completed', 'pending', 'failed'])
    @IsOptional()
    status?: 'completed' | 'pending' | 'failed';
}
