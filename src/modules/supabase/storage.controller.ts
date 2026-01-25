// import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { SupabaseService } from './supabase.service';
// import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
// import { Public } from '../auth/public.decorator';

// @Controller('storage')
// export class StorageController {
//     constructor(private readonly supabaseService: SupabaseService) { }

//     /**
//      * Get a signed upload URL for client-side upload
//      * POST /api/storage/upload-url
//      */
//     @Post('upload-url')
//     @UseGuards(JwtAuthGuard)
//     async getUploadUrl(@Body() dto: CreateUploadUrlDto) {
//         const path = this.supabaseService.getStoragePath(dto.category, dto.filename);
//         return await this.supabaseService.createSignedUploadUrl(path);
//     }

//     /**
//      * Get a signed URL for viewing a private file (Authenticated)
//      * GET /api/storage/signed-url?path=dev/profiles/uuid.png
//      */
//     @Get('signed-url')
//     @UseGuards(JwtAuthGuard)
//     async getSignedUrl(@Query('path') path: string) {
//         const signedUrl = await this.supabaseService.getSignedUrl(path);
//         return { signedUrl };
//     }

//     /**
//      * Get a signed URL for viewing a public file (Unauthenticated)
//      * GET /api/storage/public-signed-url?path=dev/products/uuid.png
//      */
//     @Public()
//     @Get('public-signed-url')
//     async getPublicSignedUrl(@Query('path') path: string) {
//         const signedUrl = await this.supabaseService.getSignedUrl(path);
//         return { signedUrl };
//     }
// }






import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupabaseService } from './supabase.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { Public } from '../auth/public.decorator';
import { log } from 'console';

@Controller('storage')
export class StorageController {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Get a signed upload URL for client-side upload
     * POST /api/storage/upload-url
     */
    // @Post('upload-url')
    // @UseGuards(JwtAuthGuard)
    // async generateUploadUrl(@Body() dto: CreateUploadUrlDto) {
    //     // 1. Calculate the path (categorized)
    //     const path = this.supabaseService.getStoragePath(dto.category, dto.filename);
    //     console.log(path)
    //     // 2. Get the upload token  
    //     const { signedUrl } = await this.supabaseService.createSignedUploadUrl(path);

    //     // 3. Get the display URL
    //     const publicUrl = this.supabaseService.getPublicUrl(path);

    //     // Return all three
    //     return {
    //         signedUrl, // Use this to PUT the file
    //         path,      // SAVE THIS to your Database (e.g. "dev/products/123.jpg")
    //         publicUrl  // Use this to show the image immediately in the App
    //     };
    // }

    @Post('upload-url')
    @UseGuards(JwtAuthGuard)
    async generateUploadUrl(@Body() dto: CreateUploadUrlDto, @Req() req) {
        // 1. Extract User ID from the Request
        const userId = req.user.userId || req.user.sub;

        // 2. Pass userId to your service to build the path
        const path = this.supabaseService.getStoragePath(dto.category, dto.filename, userId);

        console.log("Generated Path:", path);

        // 3. Get the upload token  
        const { signedUrl } = await this.supabaseService.createSignedUploadUrl(path);

        // 4. Get the display URL
        const publicUrl = this.supabaseService.getPublicUrl(path);
        
        // Debug: Log what we're returning
        console.log("Returning to frontend:", { 
            signedUrl: signedUrl ? 'present' : 'missing', 
            path, 
            publicUrl 
        });

        return { signedUrl, path, publicUrl };
    }

}