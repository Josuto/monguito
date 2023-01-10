import { BookRepository } from './book.repository';
import { Inject, Injectable } from '@nestjs/common';
import { AudioBook, Book, PaperBook, VideoBook } from './book';
import {
  CreateAudioBookDto,
  CreateBookDto,
  CreatePaperBookDto,
  CreateVideoBookDto,
} from './create-book.dto';

@Injectable()
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY') private readonly bookRepository: BookRepository,
  ) {}

  private static bookFactory(createBookDto: CreateBookDto): Book {
    if (createBookDto instanceof CreatePaperBookDto) {
      return new PaperBook(createBookDto);
    } else if (createBookDto instanceof CreateAudioBookDto) {
      return new AudioBook(createBookDto);
    } else if (createBookDto instanceof CreateVideoBookDto) {
      return new VideoBook(createBookDto);
    } else return new Book(createBookDto);
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const book = BookService.bookFactory(createBookDto);
    return this.bookRepository.save(book);
  }

  async findAll<T extends Book>(): Promise<T[]> {
    return this.bookRepository.findAll();
  }
}
