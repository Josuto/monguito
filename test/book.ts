import { PolymorphicEntity } from '../src/util/entity';

type BookType = 'Paper' | 'Audio' | 'Video';

export class Book implements PolymorphicEntity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly __t?: BookType;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    type?: BookType;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.__t = book.type;
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
    super({ ...paperBook, type: 'Paper' });
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];
  readonly format?: string;

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    hostingPlatforms: string[];
    format?: string;
  }) {
    super({ ...audioBook, type: 'Audio' });
    this.hostingPlatforms = audioBook.hostingPlatforms;
    this.format = audioBook.format ?? undefined;
  }
}

export class VideoBook extends Book {
  readonly format: string;

  constructor(videoBook: {
    id?: string;
    title: string;
    description: string;
    format: string;
  }) {
    super({ ...videoBook, type: 'Video' });
    this.format = videoBook.format;
  }
}
