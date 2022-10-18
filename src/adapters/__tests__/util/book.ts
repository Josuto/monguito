import { Entity } from '../../../domain/entity';

export class Book implements Entity {
  // This field must only be instantiated by the underlying database access technology.
  // It is optional to enable developers to create persistable instances of Book.
  readonly id?: string;
  readonly title: string;
  readonly description: string;

  constructor(book: { id?: string; title: string; description: string }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
  }
}
