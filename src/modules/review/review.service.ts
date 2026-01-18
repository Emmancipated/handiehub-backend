import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review } from './schema/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Order } from '../orders/schema/order.schema';

@Injectable()
export class ReviewService {
    private readonly logger = new Logger(ReviewService.name);

    constructor(
        @InjectModel(Review.name) private reviewModel: Model<Review>,
        @InjectModel(Order.name) private orderModel: Model<Order>,
    ) { }

    async create(createReviewDto: CreateReviewDto): Promise<Review> {
        try {
            // Check if order exists and is completed
            const order = await this.orderModel.findById(createReviewDto.orderId);
            if (!order) {
                throw new NotFoundException('Order not found');
            }

            if (order.status !== 'completed') {
                throw new BadRequestException('Can only review completed orders');
            }

            // Check if review already exists for this order
            const existingReview = await this.reviewModel.findOne({
                order: createReviewDto.orderId,
                reviewer: createReviewDto.reviewerId,
            });

            if (existingReview) {
                throw new BadRequestException('You have already reviewed this order');
            }

            const review = new this.reviewModel({
                rating: createReviewDto.rating,
                comment: createReviewDto.comment,
                reviewer: createReviewDto.reviewerId,
                reviewee: createReviewDto.revieweeId,
                order: createReviewDto.orderId,
                images: createReviewDto.images || [],
            });

            return await review.save();
        } catch (error) {
            this.logger.error('Error creating review', error.stack);
            throw error;
        }
    }

    async findAll(): Promise<Review[]> {
        return await this.reviewModel
            .find({ isVisible: true })
            .populate('reviewer', 'first_name last_name')
            .populate('reviewee', 'first_name last_name')
            .populate('order')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByHandieman(handiemanId: string): Promise<{
        reviews: Review[];
        averageRating: number;
        totalReviews: number;
    }> {
        try {
            const reviews = await this.reviewModel
                .find({ reviewee: handiemanId, isVisible: true })
                .populate('reviewer', 'first_name last_name')
                .populate('order')
                .sort({ createdAt: -1 })
                .exec();

            const totalReviews = reviews.length;
            const averageRating =
                totalReviews > 0
                    ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                    totalReviews
                    : 0;

            return {
                reviews,
                averageRating: Math.round(averageRating * 10) / 10,
                totalReviews,
            };
        } catch (error) {
            this.logger.error('Error fetching handieman reviews', error.stack);
            throw error;
        }
    }

    async findByUser(userId: string): Promise<Review[]> {
        try {
            return await this.reviewModel
                .find({ reviewer: userId })
                .populate('reviewee', 'first_name last_name')
                .populate('order')
                .sort({ createdAt: -1 })
                .exec();
        } catch (error) {
            this.logger.error('Error fetching user reviews', error.stack);
            throw error;
        }
    }

    async findByOrder(orderId: string): Promise<Review | null> {
        try {
            return await this.reviewModel
                .findOne({ order: orderId })
                .populate('reviewer', 'first_name last_name')
                .populate('reviewee', 'first_name last_name')
                .exec();
        } catch (error) {
            this.logger.error('Error fetching order review', error.stack);
            throw error;
        }
    }

    async findOne(id: string): Promise<Review> {
        try {
            const review = await this.reviewModel
                .findById(id)
                .populate('reviewer', 'first_name last_name')
                .populate('reviewee', 'first_name last_name')
                .populate('order')
                .exec();

            if (!review) {
                throw new NotFoundException('Review not found');
            }

            return review;
        } catch (error) {
            this.logger.error('Error fetching review', error.stack);
            throw error;
        }
    }

    async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
        try {
            const review = await this.reviewModel
                .findByIdAndUpdate(id, updateReviewDto, { new: true })
                .exec();

            if (!review) {
                throw new NotFoundException('Review not found');
            }

            return review;
        } catch (error) {
            this.logger.error('Error updating review', error.stack);
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        try {
            const result = await this.reviewModel.findByIdAndDelete(id).exec();
            if (!result) {
                throw new NotFoundException('Review not found');
            }
        } catch (error) {
            this.logger.error('Error deleting review', error.stack);
            throw error;
        }
    }
}
