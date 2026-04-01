import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  MinLength,
  IsEmail,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UpdateUserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export class DirectPermissionDto {
  @IsUUID()
  permissionId: string;

  @IsBoolean()
  granted: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters if provided',
  })
  password?: string;

  @IsOptional()
  @IsEnum(UpdateUserStatus)
  status?: UpdateUserStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  /** Direct permission overrides: grant or revoke. Only allowed when caller has superadmin:manage. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectPermissionDto)
  directPermissions?: DirectPermissionDto[];
}
