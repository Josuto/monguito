import { Schema } from 'mongoose';
import { BaseSchema, extendSchema } from '../../src';
import { Book, PaperBook } from '../domain/book';

export const BookSchema: Schema<Book> = extendSchema(BaseSchema, {
  title: { type: String, required: true },
  description: { type: String, required: false },
  isbn: { type: String, required: true, unique: true },
});

export const PaperBookSchema: Schema<PaperBook> = extendSchema<Book, PaperBook>(
  BookSchema,
  {
    edition: { type: Number, required: true, min: 1 },
  },
);

export const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: { type: [{ type: String }], required: true },
  format: { type: String, required: false },
});
