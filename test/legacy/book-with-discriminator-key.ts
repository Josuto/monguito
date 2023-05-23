import { PolymorphicEntity } from '../../src/util/entity';

type BookType = 'Paper' | 'Audio' | 'Electronic';

export class BookWithDiscriminatorKey implements PolymorphicEntity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;
  readonly __t?: BookType;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    type?: BookType;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
    this.__t = book.type;
  }
}

export class PaperBookWithDiscriminatorKey extends BookWithDiscriminatorKey {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    edition: number;
  }) {
    super({ ...paperBook, type: 'Paper' });
    this.edition = paperBook.edition;
  }
}

export class AudioBookWithDiscriminatorKey extends BookWithDiscriminatorKey {
  readonly hostingPlatforms: string[];
  readonly format?: string;

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    hostingPlatforms: string[];
    format?: string;
  }) {
    super({ ...audioBook, type: 'Audio' });
    this.hostingPlatforms = audioBook.hostingPlatforms;
    this.format = audioBook.format ?? undefined;
  }
}

export class ElectronicBookWithDiscriminatorKey extends BookWithDiscriminatorKey {
  readonly extension: string;

  constructor(electronicBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    extension: string;
  }) {
    super({ ...electronicBook, type: 'Electronic' });
    this.extension = electronicBook.extension;
  }
}
