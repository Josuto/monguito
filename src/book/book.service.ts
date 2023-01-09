import { BookRepository } from './book.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Book, PaperBook } from './book';
import { CreateBookDto, CreatePaperBookDto } from './create-book.dto';

@Injectable()
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY') private readonly bookRepository: BookRepository,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    let book;
    if (createBookDto instanceof CreatePaperBookDto) {
      book = new PaperBook(createBookDto);
    } else book = new Book(createBookDto);
    return this.bookRepository.save(book);
  }

  async findAll<T extends Book>(): Promise<T[]> {
    return this.bookRepository.findAll();
  }
}
