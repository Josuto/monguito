import { AuditableEntity, Entity, PolymorphicEntity } from '../src/entity';

export abstract class Book implements Entity, AuditableEntity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly version?: number;

  protected constructor(book: {
    id?: string;
    title: string;
    description: string;
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.createdAt = book.createdAt;
    this.updatedAt = book.updatedAt;
    this.version = book.version;
  }
}

type BookType = 'Paper' | 'Audio';

export class PaperBook extends Book implements PolymorphicEntity {
  readonly __type: BookType;
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
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
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
  }) {
    super(audioBook);
    this.__type = 'Audio';
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
