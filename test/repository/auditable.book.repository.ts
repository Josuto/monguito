import { MongooseRepository } from '../../src';
import { AuditableBook, AuditablePaperBook } from '../domain/auditable.book';
import {
  AuditableBookSchema,
  AuditablePaperBookSchema,
} from './auditable.book.schema';

export class MongooseAuditableBookRepository extends MongooseRepository<AuditableBook> {
  constructor() {
    super({
      type: AuditableBook,
      schema: AuditableBookSchema,
      subtypes: [
        {
          type: AuditablePaperBook,
          schema: AuditablePaperBookSchema,
        },
      ],
    });
  }
}
