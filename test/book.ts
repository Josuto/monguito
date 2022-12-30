import { Entity, PolymorphicEntity } from '../src/entity';

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

type BookType = 'Paper' | 'Audio' | 'Video';

export abstract class PolymorphicBook
  extends Book
  implements PolymorphicEntity
{
  readonly __type: BookType;

  protected constructor(book: {
    id?: string;
    title: string;
    description: string;
    __type: BookType;
  }) {
    super(book);
    this.__type = book.__type;
  }
}

export class PaperBook extends PolymorphicBook {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
  }) {
    super({ ...paperBook, __type: 'Paper' });
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends PolymorphicBook {
  readonly hostingPlatforms: string[];

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    hostingPlatforms: string[];
  }) {
    super({ ...audioBook, __type: 'Audio' });
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}

export class VideoBook extends PolymorphicBook {
  readonly format: string;

  constructor(videoBook: {
    id?: string;
    title: string;
    description: string;
    format: string;
  }) {
    super({ ...videoBook, __type: 'Video' });
    this.format = videoBook.format;
  }
}
