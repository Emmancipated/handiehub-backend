import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Order } from './schema/order.schema';
import mongoose, { Connection, Model, Error as MongooseError } from 'mongoose';
import { randomUUID } from 'crypto';
import { User } from '../user/schemas/user.schema';
import { Product } from '../product/schema/product.schema';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../message/email.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    private notificationService: NotificationService,
    private emailService: EmailService,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  async create(
    createOrderDto: CreateOrderDto,
  ): Promise<{ statusCode: number; message: string; orderId: string }> {
    const {
      productId,
      amount,
      quantity,
      status,
      deliveryDate,
      handieman,
      user,
    } = createOrderDto;
    const orderId = `HH-${randomUUID()}`;

    // Start a transaction session for ACID compliance
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1. Fetch the product and verify it exists
      const product = await this.productModel.findById(productId).session(session).exec();
      
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // 2. Check if it's a service (services don't have quantity limits)
      if (product.type !== 'service') {
        // 3. Validate stock availability for products
        if (product.quantity === undefined || product.quantity === null) {
          throw new BadRequestException('Product stock information is unavailable');
        }

        if (product.quantity <= 0) {
          throw new BadRequestException('This product is out of stock');
        }

        if (quantity > product.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Only ${product.quantity} item(s) available.`
          );
        }

        // 4. Atomically decrease product stock within transaction
        const newQuantity = product.quantity - quantity;
        
        const updateData: any = { 
          $inc: { quantity: -quantity } 
        };
        
        // If stock will reach 0, mark as inactive
        if (newQuantity <= 0) {
          updateData.$set = { isActive: false };
        }

        const updatedProduct = await this.productModel.findOneAndUpdate(
          { 
            _id: productId, 
            quantity: { $gte: quantity } // Only update if enough stock
          },
          updateData,
          { new: true, session } // Include session for transaction
        ).exec();

        if (!updatedProduct) {
          throw new BadRequestException(
            'Could not reserve stock. Product may have been purchased by another customer.'
          );
        }
        
        this.logger.log(
          `Stock updated for product ${productId}: ${product.quantity} -> ${updatedProduct.quantity}`
        );

        if (updatedProduct.quantity <= 0) {
          this.logger.log(`Product ${productId} marked as inactive (out of stock)`);
        }
      }

      // 5. Create the order - payment already verified at this point
      const paymentReference = (createOrderDto as any).paymentReference;
      
      const createdOrder = new this.orderModel({
        product: productId,
        amount,
        quantity,
        status: paymentReference ? 'new' : 'pending', // Mark as 'new' (awaiting seller action) if payment verified
        paymentStatus: paymentReference ? 'paid' : 'pending',
        paymentReference: paymentReference || null,
        deliveryDate,
        handieman,
        user,
        orderId,
      });

      // Save order within transaction
      await createdOrder.save({ session });

      this.logger.log(`Order ${orderId} created successfully for user ${user} (payment: ${paymentReference ? 'verified' : 'pending'})`);

      // If payment was successful, create escrow transaction (within same transaction)
      if (paymentReference) {
        try {
          await this.walletService.createEscrowTransaction({
            orderId: createdOrder._id.toString(),
            sellerId: handieman,
            buyerId: user,
            amount: amount,
            paymentReference: paymentReference,
            platformFeePercent: 0, // Set platform fee percentage here if needed
          });
          this.logger.log(`Escrow created for order ${orderId}`);
        } catch (escrowError) {
          // Escrow failure should abort the entire transaction
          this.logger.error(`Failed to create escrow for order ${orderId}`, escrowError.stack);
          throw escrowError; // Re-throw to trigger rollback
        }
      }

      // Commit the transaction - all operations succeeded
      await session.commitTransaction();
      this.logger.log(`Transaction committed for order ${orderId}`);

      // Send notifications to buyer and seller
      try {
        const productName = product?.name || 'Item';
        const orderNumber = orderId.slice(-8).toUpperCase();

        // Notify seller of new order
        await this.notificationService.sendOrderNotification(
          handieman,
          'order_created',
          {
            orderId: createdOrder._id.toString(),
            orderNumber: orderNumber,
            productName: productName,
            amount: amount,
          }
        );

        // Notify buyer of successful order
        await this.notificationService.sendPushNotification({
          userId: user,
          title: 'Order Placed Successfully',
          body: `Your order #${orderNumber} for "${productName}" has been placed. The seller will process it soon.`,
          type: 'order_created',
          data: {
            orderId: createdOrder._id.toString(),
            orderNumber: orderNumber,
            productName: productName,
            amount: amount,
          },
        });

        this.logger.log(`Notifications sent for order ${orderId}`);
      } catch (notificationError) {
        // Don't fail the order if notification fails
        this.logger.error(`Failed to send notifications for order ${orderId}`, notificationError.stack);
      }

      // Send email notifications to buyer and seller
      try {
        const [buyerData, sellerData] = await Promise.all([
          this.userModel.findById(user).select('first_name last_name email').exec(),
          this.userModel.findById(handieman).select('first_name last_name email handiemanProfile').exec(),
        ]);

        if (buyerData && sellerData) {
          const productImage = product?.images?.[0] || null;
          const orderDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const emailData = {
            orderNumber: orderId.slice(-8).toUpperCase(),
            productName: product?.name || 'Item',
            productImage,
            quantity,
            amount,
            buyerName: `${buyerData.first_name || ''} ${buyerData.last_name || ''}`.trim() || 'Customer',
            buyerEmail: buyerData.email,
            sellerName: (sellerData as any).handiemanProfile?.bizName || 
                        `${sellerData.first_name || ''} ${sellerData.last_name || ''}`.trim() || 'Seller',
            sellerEmail: sellerData.email,
            orderDate,
          };

          // Send emails in parallel
          await Promise.all([
            this.emailService.sendOrderConfirmationToBuyer(emailData),
            this.emailService.sendNewOrderToSeller(emailData),
          ]);

          this.logger.log(`Order emails sent for order ${orderId}`);
        }
      } catch (emailError) {
        // Don't fail the order if email fails
        this.logger.error(`Failed to send order emails for ${orderId}`, emailError.stack);
      }

      return {
        statusCode: HttpStatus.CREATED,
        message: `Your order with order number ${orderId} has been placed successfully`,
        orderId,
      };
    } catch (error) {
      // Abort the transaction - automatically rolls back stock changes and order creation
      await session.abortTransaction();
      this.logger.warn(`Transaction aborted for order ${orderId}`);

      if (error instanceof MongooseError.ValidationError) {
        this.logger.error(
          `Order validation failed: ${JSON.stringify(error.errors)}`,
        );
        const userFriendlyMessages = Object.values(error.errors).map((err) => {
          return this.formatValidationMessage(err.path);
        });
        throw new BadRequestException(userFriendlyMessages.join(', '));
      }

      this.logger.error('Error during order creation', error.stack);
      throw error;
    } finally {
      // Always end the session
      session.endSession();
    }
  }

  /**
   * Record a failed payment attempt (for admin analytics)
   * This does NOT deduct stock - it's just for tracking purposes
   */
  async createFailedOrder(createFailedOrderDto: any): Promise<any> {
    const { productId, amount, quantity, deliveryDate, handieman, user, failureReason, paymentReference } = createFailedOrderDto;

    // Generate a unique order ID for tracking
    const orderId = `FO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      // Create the failed order record (NO stock deduction)
      const failedOrder = new this.orderModel({
        product: productId,
        amount,
        quantity,
        status: 'payment_failed',
        paymentStatus: 'failed',
        paymentReference: paymentReference || null,
        failureReason,
        deliveryDate,
        handieman,
        user,
        orderId,
      });

      await failedOrder.save();

      this.logger.log(`Failed order ${orderId} recorded for user ${user} - Reason: ${failureReason}`);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Failed payment attempt recorded',
        orderId,
      };
    } catch (error) {
      this.logger.error('Error recording failed order', error.stack);
      throw error;
    }
  }

  /**
   * Get all failed orders (Admin only)
   */
  async getFailedOrders(page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ status: 'payment_failed' })
        .populate('user', 'firstName lastName email phone')
        .populate('handieman', 'firstName lastName email bizName')
        .populate('product', 'name images amount type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ status: 'payment_failed' }).exec(),
    ]);

    const formattedOrders = orders.map((order: any) => ({
      _id: order._id,
      orderId: order.orderId,
      amount: order.amount,
      quantity: order.quantity,
      status: order.status,
      paymentStatus: order.paymentStatus,
      failureReason: order.failureReason,
      deliveryDate: order.deliveryDate,
      createdAt: order.createdAt,
      buyer: order.user ? {
        id: order.user._id,
        name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
        email: order.user.email,
        phone: order.user.phone,
      } : null,
      seller: order.handieman ? {
        id: order.handieman._id,
        name: `${order.handieman.firstName || ''} ${order.handieman.lastName || ''}`.trim(),
        bizName: order.handieman.bizName,
      } : null,
      productDetails: order.product ? {
        id: order.product._id,
        name: order.product.name,
        image: order.product.images?.[0] || null,
        amount: order.product.amount,
        type: order.product.type,
      } : null,
    }));

    return {
      statusCode: HttpStatus.OK,
      data: formattedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Restore product stock when an order is cancelled
   */
  async restoreStock(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId).exec();
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const product = await this.productModel.findById(order.product).exec();
    
    if (product && product.type !== 'service') {
      product.quantity = (product.quantity || 0) + order.quantity;
      await product.save();
      
      this.logger.log(
        `Stock restored for product ${product._id}: +${order.quantity} (new total: ${product.quantity})`
      );
    }
  }

  async findAll(filters?: {
    userId?: string;
    handiemanId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    statusCode: number;
    data: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasMore: boolean;
    };
  }> {
    try {
      const query: any = {};
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      if (filters?.userId) {
        query.user = filters.userId;
      }

      if (filters?.handiemanId) {
        query.handieman = filters.handiemanId;
      }

      if (filters?.status) {
        query.status = filters.status;
      } else {
        // By default, exclude failed orders from regular queries
        // Failed orders are only visible via the /failed endpoint (admin only)
        query.status = { $ne: 'payment_failed' };
      }

      const orders = await this.orderModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('user', 'first_name last_name email phone')
        .populate('handieman', 'first_name last_name email phone handiemanProfile')
        .populate('product', 'name images amount type slug category shortDescription')
        .sort({ createdAt: -1 })
        .exec();

      const totalCount = await this.orderModel.countDocuments(query);

      // Format the orders with clean data
      const formattedOrders = orders.map((order) => {
        const orderObj = order.toObject();
        const user = orderObj.user as any;
        const handieman = orderObj.handieman as any;
        const product = orderObj.product as any;

        return {
          ...orderObj,
          buyer: user ? {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email,
            phone: user.phone,
          } : null,
          seller: handieman ? {
            id: handieman._id,
            firstName: handieman.first_name,
            lastName: handieman.last_name,
            fullName: `${handieman.first_name || ''} ${handieman.last_name || ''}`.trim(),
            email: handieman.email,
            phone: handieman.phone,
            businessName: handieman.handiemanProfile?.businessName,
            profileImage: handieman.handiemanProfile?.dp_url,
          } : null,
          productDetails: product ? {
            id: product._id,
            name: product.name,
            image: product.images?.[0] || null,
            price: product.amount,
            type: product.type,
            slug: product.slug,
            category: product.category,
            shortDescription: product.shortDescription,
          } : null,
          // Remove raw populated fields
          user: undefined,
          handieman: undefined,
          product: undefined,
        };
      });

      return {
        statusCode: HttpStatus.OK,
        data: formattedOrders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasMore: skip + orders.length < totalCount,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching orders', error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const order = await this.orderModel
        .findById(id)
        .populate('user', 'first_name last_name email phone')
        .populate('handieman', 'first_name last_name email phone handiemanProfile')
        .populate('product', 'name images amount type slug category shortDescription description')
        .exec();

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      const orderObj = order.toObject();
      const user = orderObj.user as any;
      const handieman = orderObj.handieman as any;
      const product = orderObj.product as any;

      return {
        statusCode: HttpStatus.OK,
        data: {
          ...orderObj,
          buyer: user ? {
            id: user._id,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email,
            phone: user.phone,
          } : null,
          seller: handieman ? {
            id: handieman._id,
            firstName: handieman.first_name,
            lastName: handieman.last_name,
            fullName: `${handieman.first_name || ''} ${handieman.last_name || ''}`.trim(),
            email: handieman.email,
            phone: handieman.phone,
            businessName: handieman.handiemanProfile?.businessName,
            profileImage: handieman.handiemanProfile?.dp_url,
          } : null,
          productDetails: product ? {
            id: product._id,
            name: product.name,
            images: product.images,
            price: product.amount,
            type: product.type,
            slug: product.slug,
            category: product.category,
            shortDescription: product.shortDescription,
            description: product.description,
          } : null,
          user: undefined,
          handieman: undefined,
          product: undefined,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching order', error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateData: { status?: string; deliveryDate?: Date },
  ): Promise<Order> {
    try {
      const order = await this.orderModel.findById(id);

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Validate status transitions based on order type (product vs service)
      if (updateData.status) {
        // Valid transitions for PRODUCT orders
        const productTransitions: Record<string, string[]> = {
          pending: ['new', 'cancelled'],
          new: ['confirmed', 'cancelled', 'arbitration'],
          confirmed: ['shipped', 'cancelled', 'arbitration'],
          shipped: ['delivered', 'returned', 'arbitration'],
          delivered: ['returned', 'completed', 'arbitration'],
          completed: ['arbitration'],
          returned: ['refunded', 'arbitration'],
          arbitration: ['refunded', 'completed', 'cancelled'],
          cancelled: ['refunded'],
          refunded: [],
        };

        // Valid transitions for SERVICE orders
        const serviceTransitions: Record<string, string[]> = {
          pending: ['new', 'cancelled'],
          new: ['accepted', 'cancelled', 'arbitration'],
          accepted: ['scheduled', 'in_progress', 'cancelled', 'arbitration'],
          scheduled: ['in_progress', 'cancelled', 'arbitration'],
          in_progress: ['completed', 'arbitration'],
          completed: ['arbitration'],
          arbitration: ['refunded', 'completed', 'cancelled'],
          cancelled: ['refunded'],
          refunded: [],
        };

        // Get product to determine if it's a service
        const product = await this.productModel.findById(order.product);
        const isService = product?.type === 'service';
        const validTransitions = isService ? serviceTransitions : productTransitions;

        const currentStatus = order.status;
        const allowedStatuses = validTransitions[currentStatus] || [];

        if (!allowedStatuses.includes(updateData.status)) {
          throw new BadRequestException(
            `Cannot transition from "${currentStatus}" to "${updateData.status}" for ${isService ? 'service' : 'product'} orders`,
          );
        }

        // Restore stock if order is being cancelled or refunded (only for products)
        if (['cancelled', 'refunded', 'returned'].includes(updateData.status) && 
            !['cancelled', 'refunded'].includes(order.status)) {
          if (product && product.type !== 'service') {
            // Use atomic update to restore stock
            await this.productModel.findByIdAndUpdate(
              order.product,
              { 
                $inc: { quantity: order.quantity },
                $set: { isActive: true } // Re-enable product since it has stock now
              }
            );
            
            this.logger.log(
              `Stock restored for ${updateData.status} order ${order.orderId}: +${order.quantity} to product ${product._id}`
            );
          }

          // Refund escrow if order is cancelled or refunded
          try {
            await this.walletService.refundEscrow(
              order._id.toString(),
              `Order ${updateData.status}: ${(updateData as any).statusNote || 'No reason provided'}`
            );
            this.logger.log(`Escrow refunded for order ${order.orderId}`);
          } catch (escrowError) {
            this.logger.error(`Failed to refund escrow for order ${order.orderId}`, escrowError.stack);
          }
        }

        // Mark escrow for release when order is completed (starts 5-day countdown)
        if (updateData.status === 'completed' && order.status !== 'completed') {
          try {
            await this.walletService.markOrderCompleted(order._id.toString());
            this.logger.log(`Escrow marked for release for order ${order.orderId}`);
          } catch (escrowError) {
            this.logger.error(`Failed to mark escrow for release for order ${order.orderId}`, escrowError.stack);
          }
        }

        order.status = updateData.status;
      }

      // Update tracking info if provided
      if ((updateData as any).trackingNumber) {
        (order as any).trackingNumber = (updateData as any).trackingNumber;
      }
      if ((updateData as any).shippingCarrier) {
        (order as any).shippingCarrier = (updateData as any).shippingCarrier;
      }
      if ((updateData as any).scheduledDate) {
        (order as any).scheduledDate = (updateData as any).scheduledDate;
      }
      if ((updateData as any).statusNote) {
        (order as any).statusNote = (updateData as any).statusNote;
      }

      if (updateData.deliveryDate) {
        order.deliveryDate = updateData.deliveryDate;
      }

      const updatedOrder = await order.save();

      // Send notifications for status changes
      if (updateData.status) {
        try {
          const orderNumber = order.orderId?.slice(-8).toUpperCase() || order._id.toString().slice(-8).toUpperCase();
          // Fetch product name for notification
          const productForNotification = await this.productModel.findById(order.product).select('name').exec();
          const productName = productForNotification?.name || 'Item';
          const buyerId = order.user?.toString();
          const sellerId = order.handieman?.toString();

          // Map status to notification type and messages
          const statusNotifications: Record<string, { 
            buyerType: string; 
            buyerTitle: string; 
            buyerBody: string;
            sellerType?: string;
            sellerTitle?: string;
            sellerBody?: string;
          }> = {
            confirmed: {
              buyerType: 'order_confirmed',
              buyerTitle: 'Order Confirmed',
              buyerBody: `Your order #${orderNumber} has been confirmed by the seller and will be prepared soon.`,
            },
            shipped: {
              buyerType: 'order_shipped',
              buyerTitle: 'Order Shipped',
              buyerBody: `Your order #${orderNumber} has been shipped! Track your package for delivery updates.`,
            },
            delivered: {
              buyerType: 'order_delivered',
              buyerTitle: 'Order Delivered',
              buyerBody: `Your order #${orderNumber} has been delivered. Please confirm receipt and leave a review!`,
            },
            completed: {
              buyerType: 'order_completed',
              buyerTitle: 'Order Completed',
              buyerBody: `Your order #${orderNumber} is now complete. Thank you for shopping with us!`,
              sellerType: 'payment_released',
              sellerTitle: 'Payment Pending Release',
              sellerBody: `Payment for order #${orderNumber} will be released to your wallet in 5 days.`,
            },
            cancelled: {
              buyerType: 'order_cancelled',
              buyerTitle: 'Order Cancelled',
              buyerBody: `Your order #${orderNumber} has been cancelled. A refund will be processed if applicable.`,
              sellerType: 'order_cancelled',
              sellerTitle: 'Order Cancelled',
              sellerBody: `Order #${orderNumber} has been cancelled.`,
            },
            // Service-specific statuses
            accepted: {
              buyerType: 'order_confirmed',
              buyerTitle: 'Service Accepted',
              buyerBody: `Your service request #${orderNumber} has been accepted by the provider.`,
            },
            scheduled: {
              buyerType: 'order_confirmed',
              buyerTitle: 'Service Scheduled',
              buyerBody: `Your service #${orderNumber} has been scheduled. Check the details in your orders.`,
            },
            in_progress: {
              buyerType: 'order_shipped',
              buyerTitle: 'Service In Progress',
              buyerBody: `The provider has started working on your service #${orderNumber}.`,
            },
          };

          const notification = statusNotifications[updateData.status];
          
          if (notification && buyerId) {
            // Send notification to buyer
            await this.notificationService.sendPushNotification({
              userId: buyerId,
              title: notification.buyerTitle,
              body: notification.buyerBody,
              type: notification.buyerType,
              data: {
                orderId: order._id.toString(),
                orderNumber: orderNumber,
                productName: productName,
                status: updateData.status,
              },
            });

            // Send notification to seller if applicable
            if (notification.sellerType && sellerId) {
              await this.notificationService.sendPushNotification({
                userId: sellerId,
                title: notification.sellerTitle!,
                body: notification.sellerBody!,
                type: notification.sellerType,
                data: {
                  orderId: order._id.toString(),
                  orderNumber: orderNumber,
                  productName: productName,
                  status: updateData.status,
                },
              });
            }

            this.logger.log(`Status change notification sent for order ${order.orderId}: ${updateData.status}`);
          }

          // Send email notification for status update
          try {
            const buyerUser = await this.userModel.findById(buyerId).select('first_name last_name email').exec();
            if (buyerUser && ['confirmed', 'shipped', 'delivered', 'completed', 'cancelled'].includes(updateData.status)) {
              await this.emailService.sendOrderStatusUpdate(
                buyerUser.email,
                `${buyerUser.first_name || ''} ${buyerUser.last_name || ''}`.trim() || 'Customer',
                orderNumber,
                updateData.status,
                productName,
              );
              this.logger.log(`Status email sent for order ${order.orderId}: ${updateData.status}`);
            }
          } catch (emailError) {
            this.logger.error(`Failed to send status email for order ${order.orderId}`, emailError.stack);
          }
        } catch (notificationError) {
          // Don't fail the status update if notification fails
          this.logger.error(`Failed to send status notification for order ${order.orderId}`, notificationError.stack);
        }
      }

      return updatedOrder;
    } catch (error) {
      this.logger.error('Error updating order', error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const order = await this.orderModel.findById(id);

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Only allow deletion of pending or cancelled orders
      if (order.status !== 'pending' && order.status !== 'cancelled') {
        throw new BadRequestException(
          'Can only delete pending or cancelled orders',
        );
      }

      await this.orderModel.findByIdAndDelete(id);

      return { message: 'Order deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting order', error.stack);
      throw error;
    }
  }

  async getHandiemanOverview(sellerId: string, filter: string) {
    // Calculate date range based on the filter
    const dateRange = this.getDateRange(filter);

    const orders = await this.orderModel.aggregate([
      {
        $match: {
          handieman: new mongoose.Types.ObjectId(sellerId), // Filter by sellerId
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }, // Filter by date range
          status: { $ne: 'payment_failed' }, // Exclude failed payment orders
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { 
              $cond: [
                { $in: ['$status', ['pending', 'new', 'confirmed', 'accepted', 'scheduled', 'shipped', 'in_progress']] }, 
                1, 
                0
              ] 
            },
          },
          declinedOrders: {
            $sum: { $cond: [{ $in: ['$status', ['cancelled', 'refunded']] }, 1, 0] },
          },
        },
      },
    ]);
    // Fetch recent orders (last 7 days)
    const recentOrdersDateRange = this.getDateRange('lastWeek');
    const recentOrders = await this.orderModel
      .find({
        handieman: new mongoose.Types.ObjectId(sellerId),
        status: { $ne: 'payment_failed' },
        createdAt: {
          $gte: recentOrdersDateRange.start,
          $lte: recentOrdersDateRange.end,
        },
      })
      .sort({ createdAt: -1 }); // Sort by most recent first

    // Get wallet information with escrow vs available balance
    let walletInfo = {
      availableBalance: 0,
      escrowBalance: 0,
      totalBalance: 0,
      totalEarnings: 0,
      pendingReleases: [] as any[],
    };

    try {
      const walletData = await this.walletService.getWalletBalance(sellerId);
      walletInfo = walletData.data;
    } catch (error) {
      this.logger.error(`Failed to get wallet info for seller ${sellerId}`, error.stack);
    }

    // Combine results
    const result = orders[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      declinedOrders: 0,
    };

    return {
      ...result,
      recentOrders,
      wallet: walletInfo, // Add wallet info to the response
    };
  }

  private getDateRange(filter: string) {
    const now = new Date();
    let start: Date, end: Date;

    switch (filter) {
      case 'lastWeek':
        start = new Date(now.setDate(now.getDate() - 7));
        end = new Date();
        break;
      case 'lastMonth':
        start = new Date(now.setMonth(now.getMonth() - 1));
        end = new Date();
        break;
      case 'last3Months':
        start = new Date(now.setMonth(now.getMonth() - 3));
        end = new Date();
        break;
      default: // All time
        start = new Date(0); // Unix epoch (January 1, 1970)
        end = new Date();
    }

    return { start, end };
  }

  private formatValidationMessage(field: string): string {
    switch (field) {
      case 'productId':
        return 'Invalid product ID.';
      case 'amount':
        return 'Is it free? Please input the price.';
      case 'deliveryDate':
        return 'Delivery date is required.';
      case 'handieman':
        return 'Handieman is required.';
      case 'user':
        return 'User is required.';
      case 'orderId':
        return 'Order ID is required.';
      default:
        return `${field} is required.`;
    }
  }
}
