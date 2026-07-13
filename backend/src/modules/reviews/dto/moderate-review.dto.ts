import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @IsIn(['APPROVED', 'REJECTED', 'PENDING'])
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
}

export class ReplyReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reply?: string;
}
