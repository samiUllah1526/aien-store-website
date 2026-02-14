import { IsString, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';

export enum UpdateUserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters if provided' })
  password?: string;

  @IsOptional()
  @IsEnum(UpdateUserStatus)
  status?: UpdateUserStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
