// import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
// import { CreateCatDto } from 'src/dtos/create-cat.dto';

// @Controller('cats')
// export class CatsController {
//   // @Post('breed-add')
//   // create(): string {
//   //   return 'This action adds a new cat';
//   // }

//   @Post()
//   async create(@Body() createCatDto: CreateCatDto) {
//     return 'This action adds a new cat';
//   }

//   @Get()
//   findAll(@Req() request: Request): string {
//     return 'This action returns all cats';
//   }

//   // @Get(':id')
//   // findOne(@Param() params: any): string {
//   //   console.log(params.id);
//   //   return `This action returns a #${params.id} cat`;
//   // }
// }

// // @Get()
// // async findAll(): Promise<any[]> {
// //   return [];
// // }

// import {
//   Controller,
//   Get,
//   Query,
//   Post,
//   Body,
//   Put,
//   Param,
//   Delete,
// } from '@nestjs/common';
// import {
//   CreateCatDto,
//   UpdateCatDto,
//   ListAllEntities,
// } from '../dtos/create-cat.dto';

// @Controller('cats')
// export class CatsController {
//   @Post()
//   create(@Body() createCatDto: CreateCatDto) {
//     return 'This action adds a new cat';
//   }

//   @Get()
//   findAll(@Query() query: ListAllEntities) {
//     return `This action returns all cats (limit: ${query.limit} items)`;
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return `This action returns a #${id} cat`;
//   }

//   @Put(':id')
//   update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
//     return `This action updates a #${id} cat`;
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return `This action removes a #${id} cat`;
//   }
// }

import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto, Cat } from '../dtos/create-cat.dto';
import { CatsService } from '../services/cats.service';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
