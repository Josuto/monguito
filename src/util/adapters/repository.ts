import { Optional } from 'typescript-optional';

export interface Repository<T> {
  findById: (id: string) => Promise<Optional<T>>;
  findAll: () => T[];
  save: (element: T) => T;
  deleteById: (id: string) => boolean;
}
