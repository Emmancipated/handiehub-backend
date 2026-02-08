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
import {
  CATEGORIES,
  getCategoryById as getCategoryFromConstants,
  getFeaturedCategories,
} from 'src/constants/categories';

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
      // Basic Info
      name,
      shortDescription,
      description,
      type,

      // Categorization
      category,
      subCategory,
      brandName,

      // Media
      images,

      // Pricing
      amount,
      discountedPrice,
      pricingType,
      currency,

      // Product-specific
      quantity,
      condition,
      weight,
      color,
      model,
      supplierSku,

      // Service-specific
      estimatedDuration,
      serviceArea,
      availability,

      // Policies
      returnPolicy,
      hasWarranty,
      warrantyDuration,
      warrantyDetails,

      // SEO
      tags,

      // Status
      status,
      isActive,

      // Seller
      handieman,

      // Legacy
      categoryCode,
      createdAt,
      updatedAt,
    } = createProductDto as CreateProductDto & {
      shortDescription?: string;
      subCategory?: string;
      brandName?: string;
      discountedPrice?: number;
      pricingType?: string;
      currency?: string;
      quantity?: number;
      condition?: string;
      weight?: number;
      color?: string;
      model?: string;
      supplierSku?: string;
      estimatedDuration?: number;
      serviceArea?: string;
      availability?: string[];
      returnPolicy?: string;
      hasWarranty?: boolean;
      warrantyDuration?: string;
      warrantyDetails?: string;
      isActive?: boolean;
    };

    // Generate unique identifiers
    const typePrefix = type === 'service' ? 'SVC' : 'PRD';
    const catCode = categoryCode || category || 'GEN';
    const productId = `${typePrefix}-${catCode}-${randomUUID()}`;

    // Helper to convert empty strings to undefined
    const emptyToUndefined = (val: string | undefined) =>
      val && val.trim() !== '' ? val.trim() : undefined;

    try {
      const sku = await this.skuService.getNextSKU();
      const slug = `${this.generateSlug(name)}-${sku}`;

      const createdProduct = new this.productModel({
        // Basic Info
        productId,
        name,
        shortDescription: emptyToUndefined(shortDescription),
        description,
        type,

        // Categorization
        category: emptyToUndefined(category),
        subCategory: emptyToUndefined(subCategory),
        brandName: emptyToUndefined(brandName) || '-',

        // Media
        images,

        // Pricing
        amount,
        discountedPrice,
        pricingType: pricingType || 'fixed',
        currency: currency || 'NGN',

        // Product-specific
        quantity: type === 'product' ? (quantity || 0) : undefined,
        condition: type === 'product' ? (condition || 'new') : undefined,
        weight,
        color,
        model,
        supplierSku,

        // Service-specific
        estimatedDuration: type === 'service' ? estimatedDuration : undefined,
        serviceArea: type === 'service' ? serviceArea : undefined,
        availability: type === 'service' ? availability : undefined,

        // Policies
        returnPolicy: returnPolicy || '7_days',
        hasWarranty: hasWarranty || false,
        warrantyDuration,
        warrantyDetails,

        // SEO
        tags: tags || [],
        sku,
        slug,

        // Status - auto-approve since there's no admin review flow yet
        status: status || 'approved',
        isActive: isActive !== undefined ? isActive : true,

        // Seller
        handieman,

        // Legacy
        categoryCode: catCode,
        createdAt: createdAt || new Date(),
        updatedAt: updatedAt || new Date(),
      });

      await createdProduct.save();

      return {
        statusCode: HttpStatus.OK,
        message:
          type === 'service'
            ? 'Service has been created successfully! It will be reviewed shortly.'
            : 'Product has been created successfully! It will be reviewed shortly.',
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('A listing with this ID or slug already exists');
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

    // Only fetch approved, active products/services
    // For products (not services), also filter out items with quantity <= 0
    const products = await this.productModel
      .find({
        status: 'approved',
        isActive: true,
        $or: [
          { type: 'service' }, // Services don't have stock limits
          { type: 'product', quantity: { $gt: 0 } }, // Products must have stock
        ],
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }) // Newest first
      .populate({
        path: 'handieman',
        select: 'first_name last_name email phone handiemanProfile',
      });

    // Get total count for pagination (same filter)
    const totalCount = await this.productModel.countDocuments({
      status: 'approved',
      isActive: true,
      $or: [
        { type: 'service' },
        { type: 'product', quantity: { $gt: 0 } },
      ],
    });

    const productsWithSellers = products.map((product) => {
      // Cast to any since handieman is populated with user data
      const handieman = product.handieman as any;
      
      // Extract only necessary seller info
      const seller = {
        id: handieman?._id?.toString() || null,
        firstName: handieman?.first_name || '',
        lastName: handieman?.last_name || '',
        fullName: `${handieman?.first_name || ''} ${handieman?.last_name || ''}`.trim() || 'HandieMan',
        businessName: handieman?.handiemanProfile?.businessName || null,
        profileImage: handieman?.handiemanProfile?.dp_url || null,
        isVerified: handieman?.handiemanProfile?.isVerified || false,
        phone: handieman?.phone || null,
      };

      // Return product with clean seller data (remove full handieman object)
      const productObj = product.toObject();
      delete productObj.handieman; // Remove full handieman data

      return {
        ...productObj,
        seller,
      };
    });

    return {
      statusCode: HttpStatus.OK,
      data: productsWithSellers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasMore: skip + products.length < totalCount,
      },
    };
  }

  async findOne(id: string): Promise<any> {
    // Try to find by _id first (if valid ObjectId), then by slug
    // Only return approved, active products for public access
    const activeFilter = { status: 'approved', isActive: true };
    let product;
    
    if (Types.ObjectId.isValid(id)) {
      product = await this.productModel
        .findOne({ _id: id, ...activeFilter })
        .populate({
          path: 'handieman',
          select: 'first_name last_name email phone handiemanProfile',
        })
        .exec();
    }
    
    // If not found by _id, try slug
    if (!product) {
      product = await this.productModel
        .findOne({ slug: id, ...activeFilter })
        .populate({
          path: 'handieman',
          select: 'first_name last_name email phone handiemanProfile',
        })
        .exec();
    }

    if (!product) {
      throw new NotFoundException(
        `Product/Service was not found, try another product.`,
      );
    }

    // Cast to any since handieman is populated with user data
    const handieman = product.handieman as any;
    
    // Format seller details (consistent with other methods)
    const seller = {
      id: handieman?._id?.toString() || null,
      firstName: handieman?.first_name || '',
      lastName: handieman?.last_name || '',
      fullName: `${handieman?.first_name || ''} ${handieman?.last_name || ''}`.trim() || 'HandieMan',
      businessName: handieman?.handiemanProfile?.businessName || null,
      profileImage: handieman?.handiemanProfile?.dp_url || null,
      isVerified: handieman?.handiemanProfile?.isVerified || false,
      phone: handieman?.phone || null,
      // Additional info for product detail page
      bio: handieman?.handiemanProfile?.bio || null,
      responseTime: handieman?.handiemanProfile?.responseTime || '2 hours',
      rating: handieman?.handiemanProfile?.rating || 0,
      totalReviews: handieman?.handiemanProfile?.totalReviews || 0,
    };

    const productObj = product.toObject();
    delete productObj.handieman;

    const response = {
      statusCode: HttpStatus.OK,
      data: {
        ...productObj,
        seller,
      },
    };

    return response;
  }

  /**
   * 🔍 FIND ONE RAW (for ownership verification)
   * Returns raw product document without population or transformation
   */
  async findOneRaw(id: string): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.productModel.findById(id).exec();
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

  /**
   * 🗑️ DELETE PRODUCT
   */
  async remove(id: string): Promise<{ statusCode: number; message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const deletedProduct = await this.productModel.findByIdAndDelete(id).exec();

    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Product deleted successfully',
    };
  }

  /**
   * 👤 GET PRODUCTS BY HANDIEMAN (SELLER)
   */
  async getProductsByHandieman(handiemanId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    if (!Types.ObjectId.isValid(handiemanId)) {
      throw new BadRequestException('Invalid handieman ID');
    }

    const products = await this.productModel
      .find({ handieman: handiemanId })
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.productModel.countDocuments({ handieman: handiemanId });

    return {
      statusCode: HttpStatus.OK,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
          status: 'approved',
          isActive: true,
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

    // Search by category string (case-insensitive), only approved and active
    // Also filter out out-of-stock products (not services)
    const categoryFilter = {
      category: new RegExp(`^${category}$`, 'i'),
      status: 'approved',
      isActive: true,
      $or: [
        { type: 'service' }, // Services don't have stock limits
        { type: 'product', quantity: { $gt: 0 } }, // Products must have stock
      ],
    };

    // Fetch products with pagination and populate only necessary seller fields
    const products = await this.productModel
      .find(categoryFilter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'handieman',
        select: 'first_name last_name email phone handiemanProfile',
      })
      .exec();

    // Get total count for pagination
    const totalCount = await this.productModel.countDocuments(categoryFilter);

    // Map through the products and include clean seller details
    const productsWithSellers = products.map((product) => {
      // Cast to any since handieman is populated with user data
      const handieman = product.handieman as any;
      
      const seller = {
        id: handieman?._id?.toString() || null,
        firstName: handieman?.first_name || '',
        lastName: handieman?.last_name || '',
        fullName: `${handieman?.first_name || ''} ${handieman?.last_name || ''}`.trim() || 'HandieMan',
        businessName: handieman?.handiemanProfile?.businessName || null,
        profileImage: handieman?.handiemanProfile?.dp_url || null,
        isVerified: handieman?.handiemanProfile?.isVerified || false,
        phone: handieman?.phone || null,
      };

      const productObj = product.toObject();
      delete productObj.handieman;

      return {
        ...productObj,
        seller,
      };
    });

    return {
      statusCode: HttpStatus.OK,
      data: productsWithSellers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasMore: skip + products.length < totalCount,
      },
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
        status: 'approved',
        isActive: true,
      })
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'handieman',
        select: 'first_name last_name email phone handiemanProfile',
      })
      .exec();

    const relatedWithSellers = related.map((item) => {
      // Cast to any since handieman is populated with user data
      const handieman = item.handieman as any;
      
      const seller = {
        id: handieman?._id?.toString() || null,
        firstName: handieman?.first_name || '',
        lastName: handieman?.last_name || '',
        fullName: `${handieman?.first_name || ''} ${handieman?.last_name || ''}`.trim() || 'HandieMan',
        businessName: handieman?.handiemanProfile?.businessName || null,
        profileImage: handieman?.handiemanProfile?.dp_url || null,
        isVerified: handieman?.handiemanProfile?.isVerified || false,
      };

      const itemObj = item.toObject();
      delete itemObj.handieman;

      return {
        ...itemObj,
        seller,
      };
    });

    return {
      statusCode: HttpStatus.OK,
      data: relatedWithSellers,
    };
  }

  /**
   * 📊 GET ALL CATEGORIES WITH STATS
   * Returns categories with real product and service counts from the database
   */
  async getCategoriesWithStats() {
    // Aggregate counts per category for approved and active listings
    const categoryCounts = await this.productModel.aggregate([
      {
        $match: {
          status: 'approved',
          isActive: true,
        },
      },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Process counts into a map
    const countMap: Record<string, { products: number; services: number }> = {};
    categoryCounts.forEach((item) => {
      const categoryId = item._id.category?.toLowerCase() || 'other';
      if (!countMap[categoryId]) {
        countMap[categoryId] = { products: 0, services: 0 };
      }
      if (item._id.type === 'product') {
        countMap[categoryId].products = item.count;
      } else if (item._id.type === 'service') {
        countMap[categoryId].services = item.count;
      }
    });

    // Merge with category constants to return full category data
    const categoriesWithStats = CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      description: category.description,
      color: category.color,
      type: category.type,
      featured: category.featured || false,
      order: category.order || 99,
      productCount: countMap[category.id]?.products || 0,
      serviceCount: countMap[category.id]?.services || 0,
      totalListings:
        (countMap[category.id]?.products || 0) +
        (countMap[category.id]?.services || 0),
      subCategories: category.subCategories,
    }));

    // Sort by order
    categoriesWithStats.sort((a, b) => a.order - b.order);

    return {
      statusCode: HttpStatus.OK,
      data: categoriesWithStats,
      summary: {
        totalCategories: categoriesWithStats.length,
        totalProducts: Object.values(countMap).reduce(
          (sum, c) => sum + c.products,
          0,
        ),
        totalServices: Object.values(countMap).reduce(
          (sum, c) => sum + c.services,
          0,
        ),
      },
    };
  }

  /**
   * 🌟 GET FEATURED CATEGORIES WITH STATS
   * Returns only featured categories (for home page)
   */
  async getFeaturedCategoriesWithStats() {
    const result = await this.getCategoriesWithStats();
    const featured = result.data.filter((cat) => cat.featured);

    return {
      statusCode: HttpStatus.OK,
      data: featured.slice(0, 8), // Limit to 8 featured categories
    };
  }

  /**
   * 📂 GET SUB-CATEGORIES WITH STATS
   * Returns sub-categories for a specific category with counts
   */
  async getSubCategoriesWithStats(categoryId: string) {
    const category = getCategoryFromConstants(categoryId);

    if (!category) {
      throw new NotFoundException(`Category "${categoryId}" not found`);
    }

    // Aggregate counts per sub-category for approved and active listings
    const subCategoryCounts = await this.productModel.aggregate([
      {
        $match: {
          category: new RegExp(`^${categoryId}$`, 'i'),
          status: 'approved',
          isActive: true,
        },
      },
      {
        $group: {
          _id: { subCategory: '$subCategory', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Process counts into a map
    const countMap: Record<string, { products: number; services: number }> = {};
    subCategoryCounts.forEach((item) => {
      const subCatId = item._id.subCategory?.toLowerCase() || 'uncategorized';
      if (!countMap[subCatId]) {
        countMap[subCatId] = { products: 0, services: 0 };
      }
      if (item._id.type === 'product') {
        countMap[subCatId].products = item.count;
      } else if (item._id.type === 'service') {
        countMap[subCatId].services = item.count;
      }
    });

    // Merge with sub-category constants
    const subCategoriesWithStats = category.subCategories.map((subCat) => ({
      id: subCat.id,
      name: subCat.name,
      description: subCat.description || '',
      productCount: countMap[subCat.id]?.products || 0,
      serviceCount: countMap[subCat.id]?.services || 0,
      totalListings:
        (countMap[subCat.id]?.products || 0) +
        (countMap[subCat.id]?.services || 0),
    }));

    return {
      statusCode: HttpStatus.OK,
      category: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        description: category.description,
        color: category.color,
      },
      data: subCategoriesWithStats,
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
