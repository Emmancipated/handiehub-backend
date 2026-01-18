import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @Post()
    create(@Body() createReviewDto: CreateReviewDto) {
        return this.reviewService.create(createReviewDto);
    }

    @Get()
    findAll() {
        return this.reviewService.findAll();
    }

    @Get('handieman/:id')
    findByHandieman(@Param('id') id: string) {
        return this.reviewService.findByHandieman(id);
    }

    @Get('user/:id')
    findByUser(@Param('id') id: string) {
        return this.reviewService.findByUser(id);
    }

    @Get('order/:id')
    findByOrder(@Param('id') id: string) {
        return this.reviewService.findByOrder(id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.reviewService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
        return this.reviewService.update(id, updateReviewDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.reviewService.remove(id);
    }
}
