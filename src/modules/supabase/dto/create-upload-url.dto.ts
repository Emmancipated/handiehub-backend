import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUploadUrlDto {
    @IsString()
    @IsNotEmpty()
    category: string; // e.g., 'profiles', 'products', 'services'

    @IsString()
    @IsNotEmpty()
    filename: string;
}
