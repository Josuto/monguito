import { Entity } from 'monguito';

export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  isDeleted: boolean;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    isDeleted?: boolean;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isDeleted = book.isDeleted ?? false;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
    isDeleted?: boolean;
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
    isDeleted?: boolean;
  }) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
