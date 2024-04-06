import { Entity } from '../../src/util/entity';

export type BookType = Omit<Book, 'toString'>;

export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: BookType) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
  }

  toString(): string {
    return `${this.isbn} - ${this.title}`;
  }
}

export type PaperBookType = Omit<PaperBook, 'toString'>;

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: PaperBookType) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

export type AudioBookType = Omit<AudioBook, 'toString'>;

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];
  readonly format?: string;

  constructor(audioBook: AudioBookType) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
    this.format = audioBook.format ?? undefined;
  }
}

export type ElectronicBookType = Omit<ElectronicBook, 'toString'>;

export class ElectronicBook extends Book {
  readonly extension: string;

  constructor(electronicBook: ElectronicBookType) {
    super(electronicBook);
    this.extension = electronicBook.extension;
  }
}
