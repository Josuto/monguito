import { MongooseTransactionalRepository } from '../../src';
import { AudioBook, Book, PaperBook } from '../domain/book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schema';

export class MongooseBookTransactionalRepository extends MongooseTransactionalRepository<Book> {
  constructor() {
    super({
      type: Book,
      schema: BookSchema,
      subtypes: [
        { type: PaperBook, schema: PaperBookSchema },
        { type: AudioBook, schema: AudioBookSchema },
      ],
    });
  }
}
