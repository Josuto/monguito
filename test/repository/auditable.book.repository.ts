import { MongooseRepository } from '../../src';
import { BookSchema, PaperBookSchema } from './book.schema';
import { AuditableBook, AuditablePaperBook } from '../domain/auditable.book';

export class AuditableMongooseBookRepository extends MongooseRepository<AuditableBook> {
  constructor() {
    super({
      Default: { type: AuditableBook, schema: BookSchema },
      AuditablePaperBook: { type: AuditablePaperBook, schema: PaperBookSchema },
    });
  }
}
