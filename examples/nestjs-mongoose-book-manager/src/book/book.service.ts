import { Inject, Injectable } from '@nestjs/common';
import { Book } from './book';
import { CreateBookDto } from './create-book.dto';
import { UpdateBookDto } from './update-book.dto';
import { Repository } from 'node-abstract-repository';

@Injectable()
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY')
    private readonly bookRepository: Repository<Book>,
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
