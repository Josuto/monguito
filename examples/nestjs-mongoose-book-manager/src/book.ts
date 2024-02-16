import { Entity } from 'monguito';

export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  isDeleted?: boolean;

  constructor(book: Book) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isDeleted = book.isDeleted ?? false;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: PaperBook) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];

  constructor(audioBook: AudioBook) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
