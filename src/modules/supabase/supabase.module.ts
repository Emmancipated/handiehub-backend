import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
    imports: [ConfigModule],
    controllers: [StorageController],
    providers: [SupabaseService],
    exports: [SupabaseService],
})
export class SupabaseModule { }
