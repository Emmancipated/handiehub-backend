import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  createProductSchema,
} from './dto/create-product.dto';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import {
  UpdateProductDto,
  updateProductSchema,
} from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('/create')
  create(
    @Body(new ZodValidationPipe(createProductSchema))
    createProductDto: CreateProductDto,
    @Req() req,
  ) {
    // Extract user info from JWT token
    const user = req.user;
    const userId = user.userId || user.sub;
    const userRoles: string[] = user.role || [];

    // Verify the user is a handieman (seller)
    if (!userRoles.includes('handieman')) {
      throw new ForbiddenException(
        'Only registered handiemen/sellers can create products or services. Please upgrade your account to a seller account.',
      );
    }

    // Override handieman with the authenticated user's ID
    const productData = {
      ...createProductDto,
      handieman: userId,
    };

    console.log('Creating product for user:', userId);
    console.log('User roles:', userRoles);
    console.log('Received images:', createProductDto.images);

    return this.productService.create(productData);
  }

  // @Get()
  // findAll() {
  //   return this.productService.findAll();
  // }

  @Get()
  async getProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productService.getProducts(page, limit);
  }

  /**
   * Get featured categories for the home page
   * NOTE: Must come BEFORE @Get('categories') to match correctly
   */
  @Get('categories/featured')
  async getFeaturedCategories() {
    return this.productService.getFeaturedCategoriesWithStats();
  }

  /**
   * Get all categories with product and service counts
   */
  @Get('categories')
  async getCategoriesWithStats() {
    return this.productService.getCategoriesWithStats();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.productService.searchProducts(query);
  }

  /**
   * Get sub-categories with counts for a specific category
   * NOTE: Must come BEFORE @Get('category/:category')
   */
  @Get('category/:category/subcategories')
  async getSubCategoriesWithStats(@Param('category') category: string) {
    return this.productService.getSubCategoriesWithStats(category);
  }

  @Get('category/:category')
  async getProductsByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.productService.getProductsByCategory(category, page, limit);
  }

  @Get('handieman/:handiemanId')
  async getProductsByHandieman(
    @Param('handiemanId') handiemanId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.productService.getProductsByHandieman(handiemanId, page, limit);
  }

  @Get(':id/related')
  async getRelatedProducts(
    @Param('id') id: string,
    @Query('limit') limit: number = 4,
  ) {
    return this.productService.getRelatedProducts(id, limit);
  }

  /**
   * Get single product by ID or slug
   * NOTE: Must be LAST among @Get routes with params to avoid catching other routes
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema))
    updateProductDto: UpdateProductDto,
    @Req() req,
  ) {
    // Extract user info from JWT token
    const user = req.user;
    const userId = user.userId || user.sub;
    const userRoles: string[] = user.role || [];

    // Verify the user is a handieman (seller)
    if (!userRoles.includes('handieman') && !userRoles.includes('admin')) {
      throw new ForbiddenException(
        'Only registered handiemen/sellers can update products or services.',
      );
    }

    // Verify the user owns this product (unless they're an admin)
    if (!userRoles.includes('admin')) {
      const product = await this.productService.findOneRaw(id);
      if (!product) {
        throw new ForbiddenException('Product not found.');
      }
      const productOwnerId = product.handieman?.toString() || product.handieman;
      if (productOwnerId !== userId) {
        throw new ForbiddenException(
          'You can only update your own products or services.',
        );
      }
    }

    console.log('Updating product:', id, 'by user:', userId);
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    // Extract user info from JWT token
    const user = req.user;
    const userId = user.userId || user.sub;
    const userRoles: string[] = user.role || [];

    // Verify the user is a handieman (seller)
    if (!userRoles.includes('handieman') && !userRoles.includes('admin')) {
      throw new ForbiddenException(
        'Only registered handiemen/sellers can delete products or services.',
      );
    }

    // Verify the user owns this product (unless they're an admin)
    if (!userRoles.includes('admin')) {
      const product = await this.productService.findOneRaw(id);
      if (!product) {
        throw new ForbiddenException('Product not found.');
      }
      const productOwnerId = product.handieman?.toString() || product.handieman;
      if (productOwnerId !== userId) {
        throw new ForbiddenException(
          'You can only delete your own products or services.',
        );
      }
    }

    console.log('Deleting product:', id, 'by user:', userId);
    return this.productService.remove(id);
  }
}
