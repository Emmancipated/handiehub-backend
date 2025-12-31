import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProductService } from '../src/modules/product/product.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CreateProductDto } from '../src/modules/product/dto/create-product.dto';
import { randomUUID } from 'crypto';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const productService = app.get(ProductService);
    const connection = app.get<Connection>(getConnectionToken());

    try {
        console.log('Fetching random user (handieman)...');
        const userModel = connection.model('User');
        const user = await userModel.findOne({ role: 'handieman' }).exec();

        if (!user) {
            console.error('No handieman found. Please create a user with role "handieman" first.');
            process.exit(1);
        }
        console.log(`Found handieman: ${user._id}`);

        console.log('Fetching random category...');
        const categoryModel = connection.model('Category');
        let category = await categoryModel.findOne().exec();

        if (!category) {
            console.log('No category found. Creating a default category...');
            category = await categoryModel.create({
                name: 'General',
                description: 'General category',
            });
        }
        console.log(`Found category: ${category.name} (${category._id})`);

        const productNames = ['Hammer', 'Drill', 'Wrench', 'Screwdriver', 'Saw', 'Ladder', 'Paint', 'Brush', 'Tape', 'Glue'];
        const randomName = productNames[Math.floor(Math.random() * productNames.length)] + ' ' + randomUUID().substring(0, 5);

        const createProductDto: CreateProductDto = {
            name: randomName,
            amount: Math.floor(Math.random() * 1000) + 100,
            status: 'approved',
            description: `A very useful ${randomName} for all your needs.`,
            images: ['https://picsum.photos/200/300', 'https://picsum.photos/200/300', 'https://picsum.photos/200/300'],
            createdAt: new Date(),
            updatedAt: new Date(),
            handieman: user._id.toString(),
            category: category._id.toString(),
            categoryCode: category.name.substring(0, 3).toUpperCase(),
            type: 'product',
        };

        console.log('Creating product...');
        const result = await productService.create(createProductDto);
        console.log('Product created successfully:', result);

    } catch (error) {
        console.error('Error creating product:', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
