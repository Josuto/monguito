import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AudioBook, Book, PaperBook } from './book';
import { Repository } from '../../../dist';

type PartialBook = { id: string } & Partial<Book>;

function deserialise<T extends Book>(plainBook: any): T {
  let book = null;
  if (plainBook.edition) {
    book = new PaperBook(plainBook);
  } else if (plainBook.hostingPlatforms) {
    book = new AudioBook(plainBook);
  } else {
    book = new Book(plainBook);
  }
  return book;
}

@Controller('books')
export class BookController {
  constructor(
    @Inject('BOOK_REPOSITORY')
    private readonly bookRepository: Repository<Book>,
  ) {}

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookRepository.findAll();
  }

  @Post()
  async insert(
    @Body({
      transform: (plainBook) => deserialise(plainBook),
    })
    book: Book,
  ): Promise<Book> {
    return this.save(book);
  }

  @Patch()
  async update(
    @Body()
    book: PartialBook,
  ): Promise<Book> {
    return this.save(book);
  }

  @Delete(':id')
  async deleteById(@Param('id') id: string): Promise<boolean> {
    return this.bookRepository.deleteById(id);
  }

  private async save(book: Book | PartialBook): Promise<Book> {
    try {
      return await this.bookRepository.save(book);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
