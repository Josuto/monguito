import { Entity } from '../../domain/entity';

export class Book extends Entity {
  readonly title: string;
  readonly description: string;

  constructor(book: { id?: string; title: string; description: string }) {
    super(book);
    this.title = book.title;
    this.description = book.description;
  }
}
