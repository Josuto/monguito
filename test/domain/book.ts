import { Entity } from '../../src/util/entity';

export type BookType = {
  id?: string;
  title: string;
  description: string;
  isbn: string;
};

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

export type PaperBookType = BookType & { edition: number };

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: PaperBookType) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

export type AudioBookType = BookType & {
  hostingPlatforms: string[];
  format?: string;
};

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];
  readonly format?: string;

  constructor(audioBook: AudioBookType) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
    this.format = audioBook.format ?? undefined;
  }
}

export type ElectronicBookType = BookType & { extension: string };

export class ElectronicBook extends Book {
  readonly extension: string;

  constructor(electronicBook: ElectronicBookType) {
    super(electronicBook);
    this.extension = electronicBook.extension;
  }
}
