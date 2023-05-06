import { AudioBook, Book, PaperBook } from './book';
import { Model } from 'mongoose';
import {
  BaseSchema,
  extendSchema,
  MongooseRepository,
  Repository,
} from '../src';

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
  format: { type: String, required: false },
});

export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements Repository<Book>
{
  constructor(private readonly bookModel: Model<Book>) {
    super(bookModel, { Default: Book, Paper: PaperBook, Audio: AudioBook });
  }
}
