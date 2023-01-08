import { BookRepository } from './book.repository';
import { Injectable } from '@nestjs/common';
import { Book } from './book';

@Injectable()
export class BookService {
  constructor(private readonly bookRepository: BookRepository) {}

  async findAll<T extends Book>(): Promise<T[]> {
    return this.bookRepository.findAll();
  }
}
