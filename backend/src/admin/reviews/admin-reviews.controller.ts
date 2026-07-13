import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { ReviewsService } from '../../modules/reviews/reviews.service';
import { ReviewQueryDto } from '../../modules/reviews/dto/review-query.dto';
import { CreateAdminReviewDto } from '../../modules/reviews/dto/create-admin-review.dto';
import {
  ModerateReviewDto,
  ReplyReviewDto,
} from '../../modules/reviews/dto/moderate-review.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RequirePermission } from '../../modules/auth/decorators/require-permission.decorator';

@ApiTags('admin-reviews')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @RequirePermission('reviews:read')
  async findAll(@Query() query: ReviewQueryDto) {
    const { data, total } = await this.reviewsService.findAll(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return ApiResponseDto.list(data, { total, page, limit });
  }

  @Post()
  @RequirePermission('reviews:moderate')
  async create(
    @Body() dto: CreateAdminReviewDto,
    @Req() req: { user?: { userId: string } },
  ) {
    const adminUserId = req.user?.userId;
    if (!adminUserId) throw new UnauthorizedException();
    const data = await this.reviewsService.adminCreate(dto, adminUserId);
    return ApiResponseDto.ok(data, 'Review added');
  }

  @Get(':id')
  @RequirePermission('reviews:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.reviewsService.findOne(id);
    return ApiResponseDto.ok(data);
  }

  @Patch(':id/status')
  @RequirePermission('reviews:moderate')
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    const data = await this.reviewsService.moderate(
      id,
      dto.status as ReviewStatus,
    );
    return ApiResponseDto.ok(data, `Review ${dto.status.toLowerCase()}`);
  }

  @Post(':id/reply')
  @RequirePermission('reviews:moderate')
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    const data = await this.reviewsService.reply(id, dto.reply);
    return ApiResponseDto.ok(data, 'Reply saved');
  }

  @Delete(':id')
  @RequirePermission('reviews:moderate')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.reviewsService.remove(id);
    return ApiResponseDto.ok(null, 'Review deleted');
  }
}
