import { MongooseRepository } from '../../adapters/mongoose.repository';
import { Book } from './book';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from '../../adapters/repository';
import { BaseSchema, extendSchema } from '../../adapters/mongoose.base-schema';

export const BookSchema = extendSchema(BaseSchema, {
  title: { type: String, required: true },
  description: { type: String, required: false },
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
