import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsObject,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Provider-agnostic payload for registering an upload. Frontend can send normalized fields or raw providerResponse. */
export class RegisterMediaDto {
  @IsString()
  @IsIn(['local', 'cloudinary', 's3'])
  provider: string;

  /** Normalized: provider's storage key. Omit if sending providerResponse. */
  @IsOptional()
  @IsString()
  storageKey?: string;

  /** Normalized: full delivery URL. Omit if sending providerResponse. */
  @IsOptional()
  @IsString()
  deliveryUrl?: string;

  /** Raw response from provider (Cloudinary, S3 callback, etc.). Backend will parse. */
  @IsOptional()
  @IsObject()
  providerResponse?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  bytes?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  /** For failed-upload tracking: product being edited (if any). */
  @IsOptional()
  @IsUUID()
  productId?: string;

  /** For failed-upload tracking: order for payment proof (if any). */
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
