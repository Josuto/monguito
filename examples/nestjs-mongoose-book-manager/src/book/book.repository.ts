import {
  BaseSchema,
  extendSchema,
  MongooseRepository,
  Repository,
} from 'node-abstract-repository';
import { AudioBook, Book, PaperBook } from './book';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export const BookSchema = extendSchema(
  BaseSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
  },
  { timestamps: true },
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: { type: Number, required: true, min: 1 },
});

export const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: { type: [{ type: String }], required: true },
});

export interface BookRepository extends Repository<Book> {
  findByTitle: <T extends Book>(title: string) => Promise<T[]>;
}

export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository
{
  constructor(
    @InjectModel(Book.name)
    private readonly bookModel: Model<Book>,
  ) {
    super(bookModel, { Default: Book, Paper: PaperBook, Audio: AudioBook });
  }

  async findByTitle<T extends Book>(title: string): Promise<T[]> {
    return this.bookModel
      .find({ title: title })
      .exec()
      .then((books) => books.map((book) => this.instantiateFrom(book)));
  }
}
