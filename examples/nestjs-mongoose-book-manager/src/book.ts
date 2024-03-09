import { Auditable, AuditableClass, Entity } from 'monguito';

type AuditableBookType = Book & Auditable;

export class Book extends AuditableClass implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  isDeleted?: boolean;

  constructor(book: AuditableBookType) {
    super(book);
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isDeleted = book.isDeleted ?? false;
  }
}

type AuditablePaperBookType = PaperBook & Auditable;

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: AuditablePaperBookType) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

type AuditableAudioBookType = AudioBook & Auditable;

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];

  constructor(audioBook: AuditableAudioBookType) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
