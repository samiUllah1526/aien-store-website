import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from '../../modules/reviews/reviews.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';

@ApiTags('store-reviews')
@Controller('store/reviews')
export class StoreFeaturedReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('featured')
  @ApiOperation({
    summary: 'Featured reviews for the homepage testimonials carousel',
    security: [],
  })
  async featured(@Query('limit') limit?: string) {
    const limitNum = Math.min(20, Math.max(1, Number(limit) || 12));
    const data = await this.reviewsService.listFeaturedForHomepage(limitNum);
    return ApiResponseDto.ok(data);
  }
}
