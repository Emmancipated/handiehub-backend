import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsEnum, IsArray } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  platform?: 'expo' | 'fcm' | 'apns';

  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class UnregisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class SendPushNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;
}

export class SendBulkNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  orders?: boolean;

  @IsBoolean()
  @IsOptional()
  reviews?: boolean;

  @IsBoolean()
  @IsOptional()
  promotions?: boolean;

  @IsBoolean()
  @IsOptional()
  messages?: boolean;
}
