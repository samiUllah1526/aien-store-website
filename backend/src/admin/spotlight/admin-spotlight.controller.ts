import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { SpotlightService } from '../../modules/spotlight/spotlight.service';
import {
  CreateSpotlightItemDto,
  ReorderSpotlightDto,
  UpdateSpotlightItemDto,
} from '../../modules/spotlight/dto/spotlight.dto';
import {
  SettingsService,
  SOCIAL_PROOF_DEFAULTS,
  type SocialProofValue,
} from '../../modules/settings/settings.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

class UpdateSocialProofTitlesDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reviewsEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reviewsTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  spotlightEyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  spotlightTitle?: string;
}

@ApiTags('admin-spotlight')
@Controller('admin/spotlight')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminSpotlightController {
  constructor(
    private readonly spotlightService: SpotlightService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('titles')
  @RequirePermission('reviews:read')
  async getTitles() {
    const raw =
      ((await this.settingsService.getByKey('socialProof')) as SocialProofValue | null) ??
      {};
    const pick = (v: string | undefined, fallback: string) =>
      typeof v === 'string' && v.trim() ? v.trim() : fallback;
    return ApiResponseDto.ok({
      reviewsEyebrow: pick(raw.reviewsEyebrow, SOCIAL_PROOF_DEFAULTS.reviewsEyebrow),
      reviewsTitle: pick(raw.reviewsTitle, SOCIAL_PROOF_DEFAULTS.reviewsTitle),
      spotlightEyebrow: pick(
        raw.spotlightEyebrow,
        SOCIAL_PROOF_DEFAULTS.spotlightEyebrow,
      ),
      spotlightTitle: pick(raw.spotlightTitle, SOCIAL_PROOF_DEFAULTS.spotlightTitle),
    });
  }

  @Put('titles')
  @RequirePermission('reviews:moderate')
  async saveTitles(@Body() dto: UpdateSocialProofTitlesDto) {
    const existing =
      ((await this.settingsService.getByKey('socialProof')) as SocialProofValue | null) ??
      {};
    const next: SocialProofValue = {
      reviewsEyebrow:
        dto.reviewsEyebrow?.trim() ||
        existing.reviewsEyebrow ||
        SOCIAL_PROOF_DEFAULTS.reviewsEyebrow,
      reviewsTitle:
        dto.reviewsTitle?.trim() ||
        existing.reviewsTitle ||
        SOCIAL_PROOF_DEFAULTS.reviewsTitle,
      spotlightEyebrow:
        dto.spotlightEyebrow?.trim() ||
        existing.spotlightEyebrow ||
        SOCIAL_PROOF_DEFAULTS.spotlightEyebrow,
      spotlightTitle:
        dto.spotlightTitle?.trim() ||
        existing.spotlightTitle ||
        SOCIAL_PROOF_DEFAULTS.spotlightTitle,
    };
    await this.settingsService.set('socialProof', next as Record<string, unknown>);
    return ApiResponseDto.ok(next, 'Section titles saved');
  }

  @Get()
  @RequirePermission('reviews:read')
  async list() {
    const data = await this.spotlightService.listAdmin();
    return ApiResponseDto.ok(data);
  }

  @Post()
  @RequirePermission('reviews:moderate')
  async create(@Body() dto: CreateSpotlightItemDto) {
    const data = await this.spotlightService.create(dto);
    return ApiResponseDto.ok(data, 'Spotlight item added');
  }

  @Put('reorder')
  @RequirePermission('reviews:moderate')
  async reorder(@Body() dto: ReorderSpotlightDto) {
    const data = await this.spotlightService.reorder(dto.orderedIds);
    return ApiResponseDto.ok(data, 'Spotlight order saved');
  }

  @Patch(':id')
  @RequirePermission('reviews:moderate')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpotlightItemDto,
  ) {
    const data = await this.spotlightService.update(id, dto);
    return ApiResponseDto.ok(data, 'Spotlight item updated');
  }

  @Delete(':id')
  @RequirePermission('reviews:moderate')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.spotlightService.remove(id);
    return ApiResponseDto.ok(null, 'Spotlight item deleted');
  }
}
