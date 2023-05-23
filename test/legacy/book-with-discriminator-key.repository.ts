import {
  AudioBookWithDiscriminatorKey,
  BookWithDiscriminatorKey,
  PaperBookWithDiscriminatorKey,
} from './book-with-discriminator-key';
import { Model } from 'mongoose';
import {
  IllegalArgumentException,
  MongooseRepository,
  Repository,
} from '../../src';
import { Optional } from 'typescript-optional';

export interface BookRepository extends Repository<BookWithDiscriminatorKey> {
  findByIsbn: <T extends BookWithDiscriminatorKey>(
    isbn: string,
  ) => Promise<Optional<T>>;
}

export class MongooseBookRepository
  extends MongooseRepository<BookWithDiscriminatorKey>
  implements BookRepository
{
  constructor(private readonly bookModel: Model<BookWithDiscriminatorKey>) {
    super(bookModel, {
      Default: BookWithDiscriminatorKey,
      Paper: PaperBookWithDiscriminatorKey,
      Audio: AudioBookWithDiscriminatorKey,
    });
  }

  async findByIsbn<T extends BookWithDiscriminatorKey>(
    isbn: string,
  ): Promise<Optional<T>> {
    if (!isbn)
      throw new IllegalArgumentException('The given ISBN must be valid');
    return this.bookModel
      .findOne({ isbn: isbn })
      .exec()
      .then((book) => Optional.ofNullable(this.instantiateFrom(book) as T));
  }
}
