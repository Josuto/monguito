import { Entity, PolymorphicEntity } from '../entity';
import { Exclude } from 'class-transformer';

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
  @Exclude()
  readonly __t: BookType;

  protected constructor(book: {
    id?: string;
    title: string;
    description: string;
    type: BookType;
  }) {
    super(book);
    this.__t = book.type;
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
    super({ ...paperBook, type: 'Paper' });
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
    super({ ...audioBook, type: 'Audio' });
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
    super({ ...videoBook, type: 'Video' });
    this.format = videoBook.format;
  }
}
