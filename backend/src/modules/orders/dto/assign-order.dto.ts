import { IsString, IsOptional } from 'class-validator';

export class AssignOrderDto {
  @IsOptional()
  @IsString()
  userId?: string | null;
}