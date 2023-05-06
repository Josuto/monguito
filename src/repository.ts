import { Entity } from './util/entity';
import { Optional } from 'typescript-optional';

export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>() => Promise<S[]>;
  // Inserts given element if it does not specify an ID. Otherwise, updates it
  // if there is already an element with such an ID or throws an error if there is not.
  save: <S extends T>(element: S | ({ id: string } & Partial<S>)) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
