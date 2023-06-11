import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
} from '@nestjs/common';
import { Book } from './book';
import { BookService, PartialBook } from './book.service';
import { deserialiseBook } from './deserialise-book';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  async insert(
    @Body({
      transform: (plainBook) => deserialiseBook(plainBook),
    })
    book: Book,
  ): Promise<Book> {
    const createdBook = await this.bookService.save(book);
    if (createdBook) return createdBook;
    throw new BadRequestException();
  }

  @Patch()
  async update(
    @Body()
    book: PartialBook,
  ): Promise<Book> {
    const updatedBook = await this.bookService.save(book);
    if (updatedBook) return updatedBook;
    throw new BadRequestException();
  }

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookService.findAll();
  }
}
