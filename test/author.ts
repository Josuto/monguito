import { Entity } from '../src/entity';

export class Author implements Entity {
  // This field must only be instantiated by the underlying database access technology.
  // It is optional to enable developers to create persistable instances of Author.
  readonly id?: string;
  readonly firstName: string;
  readonly surname: string;
  readonly email: string;

  constructor(author: {
    id?: string;
    firstName: string;
    surname: string;
    email: string;
  }) {
    this.id = author.id;
    this.firstName = author.firstName;
    this.surname = author.surname;
    this.email = author.email;
  }
}
