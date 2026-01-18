import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class WithdrawDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(100)
    amount: number;

    @IsString()
    @IsNotEmpty()
    bankCode: string;

    @IsString()
    @IsNotEmpty()
    accountNumber: string;

    @IsString()
    @IsNotEmpty()
    accountName: string;
}
