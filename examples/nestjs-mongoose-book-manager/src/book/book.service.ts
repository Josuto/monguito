import { Inject, Injectable } from '@nestjs/common';
import { Book } from './book';
import { Repository } from 'node-abstract-repository';

export type PartialBook = { id: string } & Partial<Book>;
export type PersistentBook = Book | PartialBook;

@Injectable()
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY')
    private readonly bookRepository: Repository<Book>,
  ) {}

  async save(book: PersistentBook): Promise<Book> {
    if (book) {
      try {
        return await this.bookRepository.save(book);
      } catch (error) {}
    }
    return null as unknown as Book;
  }

  async findAll(): Promise<Book[]> {
    return this.bookRepository.findAll();
  }
}
