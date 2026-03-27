import { IsString, IsEmail, IsOptional, IsArray, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  /** Direct permission IDs to grant (all granted: true). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}
