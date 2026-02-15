import { IsString, IsOptional, MinLength } from 'class-validator';

/** Only fields a user can update on their own profile (no status, roles). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters if provided' })
  password?: string;
}
