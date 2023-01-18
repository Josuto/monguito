import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { Book } from './book';
import { BookService } from './book.service';
import { CreateBookDto, deserialiseBookDto } from './create-book.dto';
import { UpdateBookDto } from './update-book.dto';

@Controller('books')
@UseInterceptors(ClassSerializerInterceptor)
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  async create(
    @Body({
      transform: (plainBook) => deserialiseBookDto(plainBook),
    })
    createBookDto: CreateBookDto,
  ): Promise<Book> {
    return this.bookService.create(createBookDto);
  }

  @Patch('/:bookId')
  async update(
    @Param('bookId') bookId: string,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<Book> {
    return this.bookService.update(updateBookDto);
  }

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookService.findAll();
  }
}
