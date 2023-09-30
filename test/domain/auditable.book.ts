import { Auditable } from '../../src';
import { Book, BookType } from './book';

type AuditableBookType = BookType & Auditable;

export class AuditableBook extends Book implements Auditable {
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(book: AuditableBookType) {
    super(book);
    this.createdAt = book.createdAt;
    this.updatedAt = book.updatedAt;
  }
}

type AuditablePaperBookType = AuditableBookType & { edition: number };

export class AuditablePaperBook extends AuditableBook {
  readonly edition: number;

  constructor(paperBook: AuditablePaperBookType) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}
