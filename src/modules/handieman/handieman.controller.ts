import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { HandiemanService } from './handieman.service';
import { CreateHandiemanDto } from './dto/create-handieman.dto';
import { UpdateHandiemanDto } from './dto/update-handieman.dto';

@Controller('handieman')
export class HandiemanController {
  constructor(private readonly handiemanService: HandiemanService) { }

  @Post()
  create(@Body() createHandiemanDto: CreateHandiemanDto) {
    return this.handiemanService.create(createHandiemanDto);
  }

  @Get()
  findAll() {
    return this.handiemanService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.handiemanService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateHandiemanDto: UpdateHandiemanDto,
  ) {
    return this.handiemanService.update(+id, updateHandiemanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.handiemanService.remove(+id);
  }
}
