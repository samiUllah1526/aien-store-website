import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeployMainWebsiteDto {
  @ApiPropertyOptional({
    description: 'Optional note stored in the GitHub Actions run inputs',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
