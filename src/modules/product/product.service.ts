import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './schema/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  isValidObjectId,
  Model,
  Error as MongooseError,
  Types,
} from 'mongoose';
import { randomUUID } from 'crypto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SkuService } from '../skucounter/sku.service';
import { Category } from './schema/product.schema';
import { Brand } from './schema/product.schema';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Brand.name) private brandModel: Model<Brand>,
    private skuService: SkuService,
  ) { }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<Product | { statusCode: number; message: string }> {
    const {
      name,
      amount,
      status,
      description,
      images,
      createdAt,
      updatedAt,
      handieman,
      category,
      categoryCode,
      type,
      brand,
      tags,
    } = createProductDto as CreateProductDto & {
      brand?: string;
      tags?: string[];
    };

    const productId = `${categoryCode}-${randomUUID()}`;
    try {
      // Removed race-condition prone check. Database unique index will handle this.

      const sku = await this.skuService.getNextSKU();
      const slug = `${this.generateSlug(name)}-${sku}`;

      const createdProduct = new this.productModel({
        productId,
        name,
        amount,
        status,
        description,
        images,
        createdAt,
        updatedAt,
        handieman,
        category,
        categoryCode,
        type,
        brand,
        tags,
        sku,
        slug,
      });

      await createdProduct.save();

      return {
        statusCode: HttpStatus.OK,
        message:
          'Product has been created successfully, you would be notified once product is verified',
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Product with this ID or Slug already exists');
      }
      if (error instanceof MongooseError.ValidationError) {
        this.logger.error(
          `Product validation failed: ${JSON.stringify(error.errors)}`,
        );
        const userFriendlyMessages = Object.values(error.errors).map((err) => {
          return this.formatValidationMessage(err.path);
        });
        throw new BadRequestException(userFriendlyMessages.join(', '));
      }
      this.logger.error(
        'Unexpected error during product creation',
        error.stack,
      );
      throw error;
    }
  }

  findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async getProducts(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const products = await this.productModel
      .find()
      .skip(skip)
      .limit(limit)
      .populate('handieman category brand');

    const productsWithSellers = products.map((product) => {
      const handiemanDetails = {
        firstName: product.handieman?.first_name,
        lastName: product.handieman?.last_name,
        businessName: product.handieman?.handiemanProfile?.businessName || null,
        image: product.handieman?.handiemanProfile?.dp_url,
      };

      return {
        ...product.toObject(),
        handiemanDetails,
      };
    });

    return {
      statusCode: HttpStatus.OK,
      data: productsWithSellers,
    };
  }

  async findOne(id: string): Promise<any> {
    const product = await this.productModel
      .findOne({ slug: id })
      .populate({
        path: 'handieman',
        select: 'first_name last_name handiemanProfile',
      })
      .populate('category brand')
      .exec();

    if (!product) {
      throw new NotFoundException(
        `Product/Service was not found, try another product.`,
      );
    }

    // Format seller details
    const handiemanDetails = {
      firstName: product.handieman?.first_name || '',
      lastName: product.handieman?.last_name || '',
      businessName: product.handieman?.handiemanProfile?.businessName || 'HandieMan',
      image: product.handieman?.handiemanProfile?.dp_url || '',
      isVerified: product.handieman?.handiemanProfile?.isVerified || false,
      responseTime: product.handieman?.handiemanProfile?.responseTime || '2 hours',
    };

    const response = {
      statusCode: HttpStatus.OK,
      data: {
        ...product.toObject(),
        handiemanDetails,
      },
    };

    return response;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product | { statusCode: number; message: string }> {
    const cleanedData = Object.fromEntries(
      Object.entries(updateProductDto).filter(
        ([_, value]) => value !== '' && value !== null,
      ),
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product`);
    }
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, cleanedData, { new: true, runValidators: true })
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product not found!`);
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Product updated successfully.',
    };
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }

  /**
   * 🔍 SEARCH FEATURE
   */
  async searchProducts(query: string) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const [categories, brands, rawProducts] = await Promise.all([
      this.categoryModel.find({ name: regex }).limit(5).lean(),
      this.brandModel.find({ name: regex }).limit(5).lean(),
      this.productModel
        .find({
          $or: [{ name: regex }, { description: regex }, { tags: regex }],
        })
        .limit(5)
        .lean(),
    ]);

    // Manually populate to handle mixed data types (ObjectId vs String)
    const products = await Promise.all(
      rawProducts.map(async (product) => {
        let categoryData = product.category;
        let brandData = product.brand;

        // Handle Category
        if (isValidObjectId(product.category)) {
          const cat = await this.categoryModel.findById(product.category).lean();
          categoryData = cat ? (cat as any) : product.category;
        }

        // Handle Brand
        if (isValidObjectId(product.brand)) {
          const br = await this.brandModel.findById(product.brand).lean();
          brandData = br ? (br as any) : product.brand;
        }

        return {
          ...product,
          category: categoryData,
          brand: brandData,
        };
      })
    );

    return {
      statusCode: HttpStatus.OK,
      categories,
      brands,
      products,
    };
  }

  /**
   * 📂 GET PRODUCTS BY CATEGORY
   */
  async getProductsByCategory(category: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Try to find category by ID or name
    let categoryFilter: any;

    if (isValidObjectId(category)) {
      // If it's a valid ObjectId, search by category ID
      categoryFilter = { category: category };
    } else {
      // Otherwise, search by category name
      const categoryDoc = await this.categoryModel.findOne({
        name: new RegExp(`^${category}$`, 'i')
      }).lean();

      if (!categoryDoc) {
        return {
          statusCode: HttpStatus.OK,
          data: [],
          message: 'No products found for this category',
        };
      }

      categoryFilter = { category: categoryDoc._id };
    }

    // Fetch products with pagination and populate related fields
    const products = await this.productModel
      .find(categoryFilter)
      .skip(skip)
      .limit(limit)
      .populate('handieman category brand')
      .exec();

    // Map through the products and include seller details
    const productsWithSellers = products.map((product) => {
      const handiemanDetails = {
        firstName: product.handieman?.first_name,
        lastName: product.handieman?.last_name,
        businessName: product.handieman?.handiemanProfile?.businessName || null,
        image: product.handieman?.handiemanProfile?.dp_url,
      };

      return {
        ...product.toObject(),
        handiemanDetails,
      };
    });

    return {
      statusCode: HttpStatus.OK,
      data: productsWithSellers,
    };
  }

  /**
   * 🔗 GET RELATED PRODUCTS
   */
  async getRelatedProducts(productId: string, limit: number = 4) {
    const product = await this.productModel.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const related = await this.productModel
      .find({
        category: product.category,
        _id: { $ne: productId },
        status: 'approved', // Only show approved products
      })
      .limit(limit)
      .populate('handieman category brand')
      .exec();

    const relatedWithSellers = related.map((item) => {
      const handiemanDetails = {
        firstName: item.handieman?.first_name,
        lastName: item.handieman?.last_name,
        businessName: item.handieman?.handiemanProfile?.businessName || null,
        image: item.handieman?.handiemanProfile?.dp_url,
      };

      return {
        ...item.toObject(),
        handiemanDetails,
      };
    });

    return {
      statusCode: HttpStatus.OK,
      data: relatedWithSellers,
    };
  }

  private formatValidationMessage(field: string): string {
    switch (field) {
      case 'name':
        return 'The product needs a name.';
      case 'amount':
        return 'Is it free? Please input the price';
      case 'first_name':
        return 'First name is required.';
      case 'last_name':
        return 'Last name is required.';
      case 'id':
        return 'invalid id.';
      default:
        return `${field} is required.`;
    }
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
  }
}
