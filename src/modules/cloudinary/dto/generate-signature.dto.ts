import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateSignatureDto {
    @IsString()
    @IsOptional()
    folder?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];
}
