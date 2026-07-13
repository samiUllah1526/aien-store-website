import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from '../../modules/reviews/reviews.service';
import { CreateReviewDto } from '../../modules/reviews/dto/create-review.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

type AuthedRequest = {
  user?: { userId: string; email?: string; name?: string };
};

@ApiTags('store-reviews')
@Controller('store/products/:productId/reviews')
export class StoreReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved reviews for a product (public)', security: [] })
  async list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const { data, total, summary } = await this.reviewsService.listForProduct(
      productId,
      pageNum,
      limitNum,
    );
    return {
      ...ApiResponseDto.list(data, { total, page: pageNum, limit: limitNum }),
      summary,
    };
  }

  @Public()
  @Get('summary')
  @ApiOperation({ summary: 'Aggregate rating for a product (public)', security: [] })
  async summary(@Param('productId', ParseUUIDPipe) productId: string) {
    const summary = await this.reviewsService.getSummary(productId);
    return ApiResponseDto.ok(summary);
  }

  @Get('eligibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Whether the current user can review this product' })
  async eligibility(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: AuthedRequest,
  ) {
    const user = req.user;
    if (!user?.userId) throw new UnauthorizedException();
    const data = await this.reviewsService.getEligibility(
      productId,
      user.userId,
      user.email,
    );
    return ApiResponseDto.ok(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Submit a verified-purchase review' })
  async create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: AuthedRequest,
  ) {
    const user = req.user;
    if (!user?.userId) throw new UnauthorizedException();
    const data = await this.reviewsService.create(
      productId,
      { userId: user.userId, email: user.email, name: user.name },
      dto,
    );
    return ApiResponseDto.ok(data, 'Thanks for your review!');
  }
}
