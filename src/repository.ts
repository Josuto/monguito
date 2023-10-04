import { Entity } from './util/entity';
import { Optional } from 'typescript-optional';

export type PartialEntityWithId<T> = { id: string } & Partial<T>;

export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>(filters?: any, sortBy?: any) => Promise<S[]>;
  save: <S extends T>(
    entity: S | PartialEntityWithId<S>,
    userId?: string | number,
  ) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
