import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinarySignatureResponse {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
}

@Injectable()
export class CloudinaryService {
    constructor(private configService: ConfigService) {
        // Configure Cloudinary with environment variables
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    /**
     * Generate a signed upload signature for client-side uploads
     * @param folder - The folder to upload to (e.g., 'profile', 'portfolio')
     * @param tags - Optional tags for the upload
     * @returns Signature data needed for client-side upload
     */
    generateUploadSignature(
        folder: string = 'handiehub',
        tags: string[] = [],
    ): CloudinarySignatureResponse {
        try {
            const timestamp = Math.round(new Date().getTime() / 1000);

            // Parameters to sign (must be in alphabetical order)
            const paramsToSign: Record<string, string | number> = {
                folder,
                timestamp,
            };

            if (tags.length > 0) {
                paramsToSign.tags = tags.join(',');
            }

            // Generate signature using API secret
            const signature = cloudinary.utils.api_sign_request(
                paramsToSign,
                this.configService.get<string>('CLOUDINARY_API_SECRET'),
            );

            return {
                signature,
                timestamp,
                cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
                apiKey: this.configService.get<string>('CLOUDINARY_API_KEY'),
                folder,
            };
        } catch (error) {
            throw new InternalServerErrorException(
                'Failed to generate upload signature',
            );
        }
    }

    /**
     * Delete an image from Cloudinary by public ID
     * @param publicId - The public ID of the image to delete
     */
    async deleteImage(publicId: string): Promise<{ result: string }> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new InternalServerErrorException('Failed to delete image');
        }
    }
}
