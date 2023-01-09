import { Body, Controller, Get, Post } from '@nestjs/common';
import { Book } from './book';
import { BookService } from './book.service';
import { CreateBookDto, CreatePaperBookDto } from './create-book.dto';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  async create(
    @Body({
      transform: (plainBook) => {
        if (plainBook.edition) {
          return new CreatePaperBookDto(plainBook);
        } else return new CreateBookDto(plainBook);
      },
    })
    createBookDto: CreateBookDto,
  ): Promise<Book> {
    return this.bookService.create(createBookDto);
  }

  @Get()
  async findAll<T extends Book>(): Promise<T[]> {
    return this.bookService.findAll();
  }
}
