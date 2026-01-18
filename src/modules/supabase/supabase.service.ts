// import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { createClient, SupabaseClient } from '@supabase/supabase-js';
// import { v4 as uuidv4 } from 'uuid';

// @Injectable()
// export class SupabaseService {
//     private supabase: SupabaseClient;
//     private readonly logger = new Logger(SupabaseService.name);
//     private readonly bucket: string;

//     constructor(private configService: ConfigService) {
//         const supabaseUrl = this.configService.get<string>('supabase.url');
//         const supabaseKey = this.configService.get<string>('supabase.serviceRoleKey');
//         this.bucket = this.configService.get<string>('supabase.bucket');

//         if (!supabaseUrl || !supabaseKey) {
//             this.logger.error('Supabase credentials are missing in configuration');
//         }

//         this.supabase = createClient(supabaseUrl, supabaseKey, {
//             auth: {
//                 persistSession: false,
//             },
//         });
//     }

//     /**
//      * Generate a signed URL for viewing a private file
//      * @param path The path to the file in the bucket
//      * @param expiresIn Expiration time in seconds (default 1 hour)
//      */
//     async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
//         const { data, error } = await this.supabase.storage
//             .from(this.bucket)
//             .createSignedUrl(path, expiresIn);

//         if (error) {
//             this.logger.error(`Error generating signed URL: ${error.message}`);
//             throw new InternalServerErrorException('Failed to generate signed URL');
//         }

//         return data.signedUrl;
//     }

//     /**
//      * Generate a signed upload URL for client-side uploads
//      * @param path The path where the file will be uploaded
//      * @param expiresIn Expiration time in seconds (default 1 hour)
//      */
//     async createSignedUploadUrl(path: string, expiresIn = 3600): Promise<{ signedUrl: string; token: string; path: string }> {
//         const { data, error } = await this.supabase.storage
//             .from(this.bucket)
//             .createSignedUploadUrl(path);

//         if (error) {
//             this.logger.error(`Error generating signed upload URL: ${error.message}`);
//             throw new InternalServerErrorException('Failed to generate signed upload URL');
//         }

//         return {
//             ...data,
//             path
//         };
//     }

//     /**
//      * Upload a file directly from the backend
//      * @param path Path in the bucket
//      * @param file Buffer of the file
//      * @param contentType MIME type of the file
//      */
//     async uploadImage(path: string, file: Buffer, contentType: string): Promise<string> {
//         const { data, error } = await this.supabase.storage
//             .from(this.bucket)
//             .upload(path, file, {
//                 contentType,
//                 upsert: true,
//             });

//         if (error) {
//             this.logger.error(`Error uploading image: ${error.message}`);
//             throw new InternalServerErrorException('Failed to upload image');
//         }

//         return data.path;
//     }

//     /**
//      * Delete an image from storage
//      * @param path Path to the file in the bucket
//      */
//     async deleteImage(path: string): Promise<void> {
//         const { error } = await this.supabase.storage
//             .from(this.bucket)
//             .remove([path]);

//         if (error) {
//             this.logger.error(`Error deleting image: ${error.message}`);
//             throw new InternalServerErrorException('Failed to delete image');
//         }
//     }

//     /**
//      * Generate a structured storage path based on environment and category
//      * @param category category like 'profiles', 'products', 'services'
//      * @param originalName original filename to extract extension
//      */
//     getStoragePath(category: string, originalName: string): string {
//         const env = process.env.NODE_ENV || 'dev';
//         const extension = originalName.split('.').pop();
//         const filename = `${uuidv4()}.${extension}`;
//         return `${env}/${category}/${filename}`;
//     }

//     /**
//      * Converts a stored storage path into a full usable URL.
//      * Use this when preparing data to send to the frontend.
//      */
//     getPublicUrl(path: string | null): string | null {
//         if (!path) return null;

//         // If it's already a full URL (legacy data), return it
//         if (path.startsWith('http')) return path;

//         const { data } = this.supabase.storage
//             .from(this.bucket)
//             .getPublicUrl(path);

//         return data.publicUrl;
//     }
// }




import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;
    private readonly logger = new Logger(SupabaseService.name);
    private readonly bucket: string;
    private readonly supabaseUrl: string; // Store this for manual URL construction

    constructor(private configService: ConfigService) {
        this.supabaseUrl = this.configService.get<string>('supabase.url');
        const supabaseKey = this.configService.get<string>('supabase.serviceRoleKey');
        this.bucket = this.configService.get<string>('supabase.bucket') || 'images'; // Default bucket name

        if (!this.supabaseUrl || !supabaseKey) {
            this.logger.error('Supabase credentials are missing');
        }

        this.supabase = createClient(this.supabaseUrl, supabaseKey);
    }

    /**
     * 1. CATEGORIZATION & ENVIRONMENT
     * Generates a clean path: "prod/products/uuid.jpg"
     */
    // getStoragePath(category: string, originalName: string): string {
    //     const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    //     const extension = originalName.split('.').pop();
    //     const filename = `${uuidv4()}.${extension}`;

    //     // This structure is perfect for your "Highly Categorized" requirement
    //     return `${env}/${category}/${filename}`;
    // }
    getStoragePath(category: string, originalName: string, userId: string): string {
        const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
        const extension = originalName.split('.').pop();
        const filename = `${uuidv4()}.${extension}`;

        // Inject userId into the path for isolation
        return `${env}/${category}/${userId}/${filename}`;
    }

    /**
     * 2. SECURE UPLOAD
     * Generates a signed URL so the frontend can upload directly (Security)
     */
    async createSignedUploadUrl(path: string): Promise<{ signedUrl: string; token: string; path: string }> {
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUploadUrl(path);
        this.logger.log(`Using Supabase Bucket: ${this.bucket}`);
        if (error) {
            this.logger.error(`Error generating upload URL: ${error.message}`);
            throw new InternalServerErrorException('Failed to generate upload URL');
        }

        return { ...data, path };
    }

    /**
     * 3. PERFORMANCE & MIGRATION
     * returns the full Public URL for the frontend to display immediately.
     */
    getPublicUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path; // Already a URL

        // OPTION A: Use Supabase SDK (Easiest)
        // const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
        // return data.publicUrl;

        // OPTION B: Manual Construction (FASTEST & Best for Migration logic)
        // This avoids an SDK call and lets you easily swap the domain later if you move to Cloudinary
        return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${path}`;
    }
}