import { MongooseAtomicRepository } from '../../src/mongoose.atomic-repository';
import { AudioBook, Book, PaperBook } from '../domain/book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schema';

export class MongooseBookAtomicRepository extends MongooseAtomicRepository<Book> {
  constructor() {
    super({
      Default: { type: Book, schema: BookSchema },
      PaperBook: { type: PaperBook, schema: PaperBookSchema },
      AudioBook: { type: AudioBook, schema: AudioBookSchema },
    });
  }
}
