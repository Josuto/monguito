import { Entity } from 'src/entity';
import { Optional } from 'typescript-optional';

export interface Repository<T extends Entity> {
  findById: (id: string) => Promise<Optional<T>>;
  findAll: () => Promise<T[]>;
  // Inserts given element if it does not specify an ID. Otherwise, updates it
  // if there is already an element with such an ID or throws an error if there is not.
  save: (element: T) => Promise<T>;
  deleteById: (id: string) => Promise<boolean>;
}
