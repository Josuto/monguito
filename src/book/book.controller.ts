import { Controller, Get } from '@nestjs/common';
import { Book } from './book';
import { BookService } from './book.service';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  async findAll<T extends Book>(): Promise<T[]> {
    return this.bookService.findAll();
  }
}
