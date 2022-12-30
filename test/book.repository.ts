import {
  BaseSchema,
  extendSchema,
} from '../src/repository/mongoose.base-schema';
import { Repository } from '../src/repository/repository';
import { AudioBook, Book, PaperBook } from './book';
import { MongooseRepository } from '../src/repository/mongoose.repository';
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

export type BookRepository = Repository<Book>;

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
}
