import { Entity, PolymorphicEntity } from '../src/entity';

export abstract class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;

  protected constructor(book: {
    id?: string;
    title: string;
    description: string;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
  }
}

type BookType = 'Paper' | 'Audio' | 'Video';

export class PaperBook extends Book implements PolymorphicEntity {
  readonly __type: BookType;
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
  }) {
    super(paperBook);
    this.__type = 'Paper';
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends Book implements PolymorphicEntity {
  readonly __type: BookType;
  readonly hostingPlatforms: string[];

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    hostingPlatforms: string[];
  }) {
    super(audioBook);
    this.__type = 'Audio';
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}

export class VideoBook extends Book implements PolymorphicEntity {
  readonly __type: BookType;
  readonly format: string;

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    format: string;
  }) {
    super(audioBook);
    this.__type = 'Video';
    this.format = audioBook.format;
  }
}
