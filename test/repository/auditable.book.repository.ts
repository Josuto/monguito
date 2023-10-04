import { MongooseRepository } from '../../src';
import { AuditableBook, AuditablePaperBook } from '../domain/auditable.book';
import {
  AuditableBookSchema,
  AuditablePaperBookSchema,
} from './auditable.book.schema';

export class AuditableMongooseBookRepository extends MongooseRepository<AuditableBook> {
  constructor() {
    super({
      Default: { type: AuditableBook, schema: AuditableBookSchema },
      AuditablePaperBook: {
        type: AuditablePaperBook,
        schema: AuditablePaperBookSchema,
      },
    });
  }
}
