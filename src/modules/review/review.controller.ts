import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    Request,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, SellerResponseDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    /**
     * Create a new review (requires auth)
     */
    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Request() req: any, @Body() createReviewDto: CreateReviewDto) {
        // Override reviewerId with the authenticated user
        createReviewDto.reviewerId = req.user.userId;
        return this.reviewService.create(createReviewDto);
    }

    /**
     * Get all reviews (paginated)
     */
    @Get()
    findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
    ) {
        return this.reviewService.findAll(parseInt(page, 10), parseInt(limit, 10));
    }

    /**
     * Get reviews for a specific product (public)
     */
    @Get('product/:id')
    findByProduct(
        @Param('id') id: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reviewService.findByProduct(id, parseInt(page, 10), parseInt(limit, 10));
    }

    /**
     * Get reviews for a handieman/seller (public)
     */
    @Get('seller/:id')
    findBySeller(
        @Param('id') id: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reviewService.findByHandieman(id, parseInt(page, 10), parseInt(limit, 10));
    }

    /**
     * Get reviews for a handieman/seller - legacy endpoint
     */
    @Get('handieman/:id')
    findByHandieman(
        @Param('id') id: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reviewService.findByHandieman(id, parseInt(page, 10), parseInt(limit, 10));
    }

    /**
     * Get current user's reviews (requires auth)
     */
    @Get('my-reviews')
    @UseGuards(JwtAuthGuard)
    findMyReviews(
        @Request() req: any,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reviewService.findByUser(req.user.userId, parseInt(page, 10), parseInt(limit, 10));
    }

    /**
     * Get reviews by user ID
     */
    @Get('user/:id')
    findByUser(
        @Param('id') id: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reviewService.findByUser(id, parseInt(page, 10), parseInt(limit, 10));
    }

    /**
     * Check if user can review an order (requires auth)
     */
    @Get('can-review/:orderId')
    @UseGuards(JwtAuthGuard)
    canReview(@Request() req: any, @Param('orderId') orderId: string) {
        return this.reviewService.canUserReview(req.user.userId, orderId);
    }

    /**
     * Get review for a specific order
     */
    @Get('order/:id')
    findByOrder(@Param('id') id: string) {
        return this.reviewService.findByOrder(id);
    }

    /**
     * Add seller response to a review (requires auth)
     */
    @Post(':id/response')
    @UseGuards(JwtAuthGuard)
    addSellerResponse(
        @Request() req: any,
        @Param('id') id: string,
        @Body() responseDto: SellerResponseDto,
    ) {
        return this.reviewService.addSellerResponse(id, req.user.userId, responseDto.response);
    }

    /**
     * Get a specific review by ID
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.reviewService.findOne(id);
    }

    /**
     * Update a review (requires auth)
     */
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
        return this.reviewService.update(id, updateReviewDto);
    }

    /**
     * Delete a review (requires auth)
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.reviewService.remove(id);
    }
}
