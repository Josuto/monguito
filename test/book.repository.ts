import { AudioBook, Book, PaperBook } from './book';
import { Model } from 'mongoose';
import {
  BaseSchema,
  extendSchema,
  IllegalArgumentException,
  MongooseRepository,
  Repository,
} from '../src';
import { Optional } from 'typescript-optional';

export const BookSchema = extendSchema(
  BaseSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    isbn: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: { type: Number, required: true, min: 1 },
});

export const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: { type: [{ type: String }], required: true },
  format: { type: String, required: false },
});

export interface BookRepository extends Repository<Book> {
  findByIsbn: <T extends Book>(isbn: string) => Promise<Optional<T>>;
}

export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository
{
  constructor(private readonly bookModel: Model<Book>) {
    super(bookModel, { Default: Book, Paper: PaperBook, Audio: AudioBook });
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
