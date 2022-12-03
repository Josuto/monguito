import { MongooseRepository } from '../src/repository/mongoose.repository';
import { Book } from './book';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from '../src/repository/repository';
import {
  BaseSchema,
  extendSchema,
} from '../src/repository/mongoose.base-schema';

export const BookSchema = extendSchema(BaseSchema, {
  title: { type: String, required: true },
  description: { type: String, required: false },
  isbn: { type: String, required: true, unique: true },
});
export type BookRepository = Repository<Book>;

export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository
{
  constructor(
    @InjectModel(Book.name)
    protected bookModel: Model<Book>,
  ) {
    super(bookModel, Book);
  }
}
