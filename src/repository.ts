import { Entity } from './util/entity';
import { Optional } from 'typescript-optional';

export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>() => Promise<S[]>;
  save: <S extends T>(entity: S | ({ id: string } & Partial<S>)) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
