import { IsString, IsEmail, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';

export enum CreateUserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export class CreateUserDto {
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

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsEnum(CreateUserStatus)
  status?: CreateUserStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
