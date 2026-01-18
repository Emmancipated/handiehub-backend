import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService, CloudinarySignatureResponse } from './cloudinary.service';
import { GenerateSignatureDto } from './dto/generate-signature.dto';

@Controller('upload')
export class UploadController {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    /**
     * Generate a signed upload URL for client-side Cloudinary uploads
     * POST /api/upload/signature
     */
    @Post('signature')
    @UseGuards(JwtAuthGuard)
    generateSignature(
        @Body() dto: GenerateSignatureDto,
    ): CloudinarySignatureResponse {
        const folder = dto.folder || 'handiehub';
        const tags = dto.tags || [];

        return this.cloudinaryService.generateUploadSignature(folder, tags);
    }

    /**
     * Generate multiple signatures at once (for batch uploads)
     * POST /api/upload/signatures
     */
    @Post('signatures')
    @UseGuards(JwtAuthGuard)
    generateMultipleSignatures(
        @Body() dto: { count: number; folder?: string; tags?: string[] },
    ): CloudinarySignatureResponse[] {
        const signatures: CloudinarySignatureResponse[] = [];
        const folder = dto.folder || 'handiehub';
        const tags = dto.tags || [];
        const count = Math.min(dto.count || 1, 10); // Max 10 signatures at once

        for (let i = 0; i < count; i++) {
            signatures.push(
                this.cloudinaryService.generateUploadSignature(folder, tags),
            );
        }

        return signatures;
    }
}
