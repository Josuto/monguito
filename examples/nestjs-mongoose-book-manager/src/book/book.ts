import { Entity } from 'node-abstract-repository';

export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;

  constructor(book: { id?: string; title: string; description: string }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
  }) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    hostingPlatforms: string[];
  }) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
