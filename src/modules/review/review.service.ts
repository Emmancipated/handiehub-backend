import {
    BadRequestException,
    ForbiddenException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schema/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Order } from '../orders/schema/order.schema';
import { User } from '../user/schemas/user.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ReviewService {
    private readonly logger = new Logger(ReviewService.name);

    constructor(
        @InjectModel(Review.name) private reviewModel: Model<Review>,
        @InjectModel(Order.name) private orderModel: Model<Order>,
        @InjectModel(User.name) private userModel: Model<User>,
        private notificationService: NotificationService,
    ) { }

    async create(createReviewDto: CreateReviewDto): Promise<any> {
        try {
            // Check if order exists and is completed
            const order = await this.orderModel
                .findById(createReviewDto.orderId)
                .populate('product', 'name images')
                .exec();
            
            if (!order) {
                throw new NotFoundException('Order not found');
            }

            if (order.status !== 'completed' && order.status !== 'delivered') {
                throw new BadRequestException('Can only review completed or delivered orders');
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
                product: createReviewDto.productId || (order as any).product?._id || null,
                images: createReviewDto.images || [],
                isVerifiedPurchase: true,
            });

            const savedReview = await review.save();

            this.logger.log(`Review created for order ${createReviewDto.orderId} by user ${createReviewDto.reviewerId}`);

            // Send notification to seller about new review
            try {
                const reviewer = await this.userModel.findById(createReviewDto.reviewerId).select('first_name last_name').exec();
                const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}`.trim() : 'A customer';
                const productName = (order as any).product?.name || 'your product/service';

                await this.notificationService.sendReviewNotification(
                    createReviewDto.revieweeId,
                    reviewerName,
                    productName,
                    createReviewDto.rating,
                );

                this.logger.log(`Review notification sent to seller ${createReviewDto.revieweeId}`);
            } catch (notificationError) {
                // Don't fail the review if notification fails
                this.logger.error('Failed to send review notification', notificationError.stack);
            }

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Review submitted successfully',
                data: savedReview,
            };
        } catch (error) {
            this.logger.error('Error creating review', error.stack);
            throw error;
        }
    }

    async findAll(page: number = 1, limit: number = 20): Promise<any> {
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            this.reviewModel
                .find({ isVisible: true })
                .populate('reviewer', 'first_name last_name')
                .populate('reviewee', 'first_name last_name handiemanProfile')
                .populate('product', 'name images slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.reviewModel.countDocuments({ isVisible: true }).exec(),
        ]);

        return {
            statusCode: HttpStatus.OK,
            data: reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findByProduct(productId: string, page: number = 1, limit: number = 10): Promise<any> {
        try {
            const skip = (page - 1) * limit;

            const [reviews, total, ratingStats] = await Promise.all([
                this.reviewModel
                    .find({ product: new Types.ObjectId(productId), isVisible: true })
                    .populate('reviewer', 'first_name last_name')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.reviewModel.countDocuments({ 
                    product: new Types.ObjectId(productId), 
                    isVisible: true 
                }).exec(),
                this.reviewModel.aggregate([
                    { $match: { product: new Types.ObjectId(productId), isVisible: true } },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: '$rating' },
                            totalReviews: { $sum: 1 },
                            rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                            rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                            rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                            rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                            rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                        },
                    },
                ]).exec(),
            ]);

            const stats = ratingStats[0] || {
                averageRating: 0,
                totalReviews: 0,
                rating5: 0,
                rating4: 0,
                rating3: 0,
                rating2: 0,
                rating1: 0,
            };

            const formattedReviews = reviews.map((review: any) => ({
                id: review._id,
                rating: review.rating,
                comment: review.comment,
                images: review.images,
                isVerifiedPurchase: review.isVerifiedPurchase,
                sellerResponse: review.sellerResponse,
                sellerResponseAt: review.sellerResponseAt,
                createdAt: review.createdAt,
                reviewer: review.reviewer ? {
                    id: review.reviewer._id,
                    name: `${review.reviewer.first_name || ''} ${review.reviewer.last_name || ''}`.trim(),
                    initial: (review.reviewer.first_name?.[0] || 'U').toUpperCase(),
                } : null,
            }));

            return {
                statusCode: HttpStatus.OK,
                data: {
                    reviews: formattedReviews,
                    stats: {
                        averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
                        totalReviews: stats.totalReviews,
                        ratingDistribution: {
                            5: stats.rating5,
                            4: stats.rating4,
                            3: stats.rating3,
                            2: stats.rating2,
                            1: stats.rating1,
                        },
                    },
                },
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            this.logger.error('Error fetching product reviews', error.stack);
            throw error;
        }
    }

    async findByHandieman(handiemanId: string, page: number = 1, limit: number = 10): Promise<any> {
        try {
            const skip = (page - 1) * limit;

            const [reviews, total, ratingStats] = await Promise.all([
                this.reviewModel
                    .find({ reviewee: new Types.ObjectId(handiemanId), isVisible: true })
                    .populate('reviewer', 'first_name last_name')
                    .populate('product', 'name images slug')
                    .populate('order', 'orderId')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.reviewModel.countDocuments({ 
                    reviewee: new Types.ObjectId(handiemanId), 
                    isVisible: true 
                }).exec(),
                this.reviewModel.aggregate([
                    { $match: { reviewee: new Types.ObjectId(handiemanId), isVisible: true } },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: '$rating' },
                            totalReviews: { $sum: 1 },
                        },
                    },
                ]).exec(),
            ]);

            const stats = ratingStats[0] || { averageRating: 0, totalReviews: 0 };

            const formattedReviews = reviews.map((review: any) => ({
                id: review._id,
                rating: review.rating,
                comment: review.comment,
                images: review.images,
                isVerifiedPurchase: review.isVerifiedPurchase,
                sellerResponse: review.sellerResponse,
                sellerResponseAt: review.sellerResponseAt,
                createdAt: review.createdAt,
                reviewer: review.reviewer ? {
                    id: review.reviewer._id,
                    name: `${review.reviewer.first_name || ''} ${review.reviewer.last_name || ''}`.trim(),
                    initial: (review.reviewer.first_name?.[0] || 'U').toUpperCase(),
                } : null,
                product: review.product ? {
                    id: review.product._id,
                    name: review.product.name,
                    image: review.product.images?.[0],
                    slug: review.product.slug,
                } : null,
            }));

            return {
                statusCode: HttpStatus.OK,
                data: {
                    reviews: formattedReviews,
                    stats: {
                        averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
                        totalReviews: stats.totalReviews,
                    },
                },
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            this.logger.error('Error fetching handieman reviews', error.stack);
            throw error;
        }
    }

    async findByUser(userId: string, page: number = 1, limit: number = 10): Promise<any> {
        try {
            const skip = (page - 1) * limit;

            const [reviews, total] = await Promise.all([
                this.reviewModel
                    .find({ reviewer: new Types.ObjectId(userId) })
                    .populate('reviewee', 'first_name last_name handiemanProfile')
                    .populate('product', 'name images slug')
                    .populate('order', 'orderId')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.reviewModel.countDocuments({ reviewer: new Types.ObjectId(userId) }).exec(),
            ]);

            const formattedReviews = reviews.map((review: any) => ({
                id: review._id,
                rating: review.rating,
                comment: review.comment,
                images: review.images,
                createdAt: review.createdAt,
                sellerResponse: review.sellerResponse,
                sellerResponseAt: review.sellerResponseAt,
                product: review.product ? {
                    id: review.product._id,
                    name: review.product.name,
                    image: review.product.images?.[0],
                    slug: review.product.slug,
                } : null,
                seller: review.reviewee ? {
                    id: review.reviewee._id,
                    name: `${review.reviewee.first_name || ''} ${review.reviewee.last_name || ''}`.trim(),
                    businessName: review.reviewee.handiemanProfile?.businessName,
                } : null,
            }));

            return {
                statusCode: HttpStatus.OK,
                data: formattedReviews,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            this.logger.error('Error fetching user reviews', error.stack);
            throw error;
        }
    }

    async findByOrder(orderId: string): Promise<any> {
        try {
            const review = await this.reviewModel
                .findOne({ order: new Types.ObjectId(orderId) })
                .populate('reviewer', 'first_name last_name')
                .populate('reviewee', 'first_name last_name')
                .populate('product', 'name images')
                .exec();

            return {
                statusCode: HttpStatus.OK,
                data: review ? {
                    id: review._id,
                    rating: review.rating,
                    comment: review.comment,
                    images: review.images,
                    isVerifiedPurchase: review.isVerifiedPurchase,
                    sellerResponse: review.sellerResponse,
                    sellerResponseAt: review.sellerResponseAt,
                    createdAt: review.createdAt,
                    reviewer: (review.reviewer as any) ? {
                        name: `${(review.reviewer as any).first_name || ''} ${(review.reviewer as any).last_name || ''}`.trim(),
                    } : null,
                } : null,
            };
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

    async addSellerResponse(reviewId: string, sellerId: string, response: string): Promise<any> {
        try {
            const review = await this.reviewModel.findById(reviewId).exec();

            if (!review) {
                throw new NotFoundException('Review not found');
            }

            if (review.reviewee.toString() !== sellerId) {
                throw new ForbiddenException('You can only respond to reviews on your own products/services');
            }

            if (review.sellerResponse) {
                throw new BadRequestException('You have already responded to this review');
            }

            review.sellerResponse = response;
            review.sellerResponseAt = new Date();
            await review.save();

            return {
                statusCode: HttpStatus.OK,
                message: 'Response added successfully',
                data: {
                    sellerResponse: review.sellerResponse,
                    sellerResponseAt: review.sellerResponseAt,
                },
            };
        } catch (error) {
            this.logger.error('Error adding seller response', error.stack);
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

    /**
     * Check if user can review an order
     */
    async canUserReview(userId: string, orderId: string): Promise<any> {
        try {
            const order = await this.orderModel.findById(orderId).exec();

            if (!order) {
                return { statusCode: HttpStatus.OK, data: { canReview: false, reason: 'Order not found' } };
            }

            if ((order.user as any).toString() !== userId) {
                return { statusCode: HttpStatus.OK, data: { canReview: false, reason: 'Not your order' } };
            }

            if (order.status !== 'completed' && order.status !== 'delivered') {
                return { statusCode: HttpStatus.OK, data: { canReview: false, reason: 'Order not completed' } };
            }

            const existingReview = await this.reviewModel.findOne({
                order: orderId,
                reviewer: userId,
            }).exec();

            if (existingReview) {
                return { statusCode: HttpStatus.OK, data: { canReview: false, reason: 'Already reviewed', reviewId: existingReview._id } };
            }

            return { statusCode: HttpStatus.OK, data: { canReview: true } };
        } catch (error) {
            this.logger.error('Error checking review eligibility', error.stack);
            throw error;
        }
    }
}
