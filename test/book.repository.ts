import { Model } from 'mongoose';
import {
  IllegalArgumentException,
  MongooseRepository,
  Repository,
} from '../src';
import { Optional } from 'typescript-optional';
import { AudioBook, Book, PaperBook } from './book';

export interface BookRepository extends Repository<Book> {
  findByIsbn: <T extends Book>(isbn: string) => Promise<Optional<T>>;
}

export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository
{
  constructor(private readonly bookModel: Model<Book>) {
    super(bookModel, {
      Default: Book,
      PaperBook: PaperBook,
      AudioBook: AudioBook,
    });
  }

  async findByIsbn<T extends Book>(isbn: string): Promise<Optional<T>> {
    if (!isbn)
      throw new IllegalArgumentException('The given ISBN must be valid');
    return this.bookModel
      .findOne({ isbn: isbn })
      .exec()
      .then((book) => Optional.ofNullable(this.instantiateFrom(book) as T));
  }
}
