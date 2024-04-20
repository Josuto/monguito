import { Schema } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { BaseSchema, extendSchema } from '../../src';
import { AudioBook, Book, PaperBook } from '../domain/book';

export const BookSchema: Schema<Book> = extendSchema(
  BaseSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    isbn: { type: String, required: true, unique: true },
  },
  { plugins: [{ fn: uniqueValidator }] },
);

export const PaperBookSchema: Schema<PaperBook> = extendSchema(
  BookSchema,
  new Schema<PaperBook>({
    edition: { type: Number, required: true, min: 1 },
  }),
);

export const AudioBookSchema: Schema<AudioBook> = extendSchema<Book, AudioBook>(
  BookSchema,
  {
    hostingPlatforms: { type: [{ type: String }], required: true },
    format: { type: String, required: false },
  },
);
