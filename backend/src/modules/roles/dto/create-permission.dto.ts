import { IsString, IsOptional, MinLength, Matches } from 'class-validator';

/** Permission name format: resource:action (e.g. users:read, products:write). */
const PERMISSION_NAME_REGEX = /^[a-z0-9]+:[a-z0-9]+$/;

export class CreatePermissionDto {
  @IsString()
  @MinLength(1)
  @Matches(PERMISSION_NAME_REGEX, {
    message:
      'Permission name must use format resource:action (e.g. users:read, products:write)',
  })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
