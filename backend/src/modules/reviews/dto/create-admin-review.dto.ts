import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_REVIEW_MEDIA } from '../../media/storage/storage-provider.interface';

export class CreateAdminReviewDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MaxLength(120)
  authorName: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MaxLength(4000)
  body: string;

  /** Display the "Verified Purchase" badge. Only for genuine purchases. */
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  /** Optional real order to link for provenance (must contain the product). */
  @IsOptional()
  @IsUUID()
  orderId?: string;

  /** Optional review date (ISO). Lets imported feedback keep its real date. */
  @IsOptional()
  @IsString()
  reviewDate?: string;

  @IsOptional()
  @IsIn(['APPROVED', 'PENDING', 'REJECTED'])
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';

  /** Pre-uploaded review media IDs (images/videos), max 5. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REVIEW_MEDIA)
  @IsUUID('4', { each: true })
  mediaIds?: string[];
}
