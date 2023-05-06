import { BookRepository } from './book.repository';
import { Inject, Injectable } from '@nestjs/common';
import { Book } from './book';
import { CreateBookDto } from './create-book.dto';
import { UpdateBookDto } from './update-book.dto';

@Injectable()
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY') private readonly bookRepository: BookRepository,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    return this.bookRepository.save(createBookDto.toBook());
  }

  async update(updateBookDto: UpdateBookDto): Promise<Book> {
    return this.bookRepository.save(updateBookDto);
  }

  async findAll(): Promise<Book[]> {
    return this.bookRepository.findAll();
  }
}
