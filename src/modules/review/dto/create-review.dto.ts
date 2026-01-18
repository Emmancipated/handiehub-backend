import {
    IsNotEmpty,
    IsNumber,
    IsString,
    Max,
    Min,
    IsOptional,
    IsArray,
} from 'class-validator';

export class CreateReviewDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(5)
    rating: number;

    @IsString()
    @IsNotEmpty()
    comment: string;

    @IsString()
    @IsNotEmpty()
    reviewerId: string;

    @IsString()
    @IsNotEmpty()
    revieweeId: string;

    @IsString()
    @IsNotEmpty()
    orderId: string;

    @IsArray()
    @IsOptional()
    images?: string[];
}
