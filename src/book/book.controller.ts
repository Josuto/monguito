import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { Book } from './book';
import { BookService } from './book.service';
import { CreateBookDto, deserialiseBook } from './create-book.dto';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  async create(
    @Body({
      transform: (plainBook) => deserialiseBook(plainBook),
    })
    createBookDto: CreateBookDto,
  ): Promise<Book> {
    return this.bookService.create(createBookDto);
  }

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll<T extends Book>(): Promise<T[]> {
    return this.bookService.findAll();
  }
}
