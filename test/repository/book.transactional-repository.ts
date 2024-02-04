import { MongooseTransactionalRepository } from '../../src';
import { AudioBook, Book, PaperBook } from '../domain/book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schema';

export class MongooseBookTransactionalRepository extends MongooseTransactionalRepository<Book> {
  constructor() {
    super({
      Default: { type: Book, schema: BookSchema },
      PaperBook: { type: PaperBook, schema: PaperBookSchema },
      AudioBook: { type: AudioBook, schema: AudioBookSchema },
    });
  }
}
