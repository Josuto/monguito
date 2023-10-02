import { Auditable, AuditableClass, Entity } from '../../src';
import { BookType } from './book';

type AuditableBookType = BookType & Auditable;

export class AuditableBook extends AuditableClass implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: AuditableBookType) {
    super(book);
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
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
