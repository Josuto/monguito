import { Schema } from 'mongoose';
import { Entity } from './entity';
import { IllegalArgumentException } from './exceptions';

/**
 * Models a domain object instance constructor.
 */
export type Constructor<T> = new (...args: any) => T;

/**
 * Models an abstract domain object supertype instance constructor.
 */

export type AbsConstructor<T> = abstract new (...args: any) => T;

/**
 * Models some domain object subtype data.
 */
export type TypeData<T> = {
  type: Constructor<T>;
  schema: Schema;
};

/**
 * Models some domain object supertype data.
 */
export type SupertypeData<T> = {
  type: Constructor<T> | AbsConstructor<T>;
  schema: Schema;
};

/**
 * Models a map of domain object subtypes.
 */
export type SubtypeMap<T> = {
  [key: string]: TypeData<T extends infer U ? U : never>;
};

/**
 * Models a map of domain object supertype and subtypes.
 */
export type TypeMap<T extends Entity> =
  | {
      ['Default']: SupertypeData<T>;
    }
  | SubtypeMap<T>;

/**
 * A `TypeMap` implementation designed to ease map content handling for its clients.
 */
export class TypeMapImpl<T extends Entity> {
  readonly types: string[];
  readonly default: SupertypeData<T>;
  readonly data: TypeData<T>[];

  constructor(map: TypeMap<T>) {
    if (!map.Default) {
      throw new IllegalArgumentException(
        'The given map must include domain supertype data',
      );
    }
    this.default = map.Default as SupertypeData<T>;
    this.types = Object.keys(map).filter((key) => key !== 'Default');
    this.data = Object.entries(map).reduce((accumulator, entry) => {
      if (entry[0] !== 'Default') {
        // @ts-expect-error - safe instantiation as any non-root map entry refers to some subtype data
        accumulator.push(entry[1]);
      }
      return accumulator;
    }, []);
  }

  getSubtypeData(type: string): TypeData<T> | undefined {
    const index = this.types.indexOf(type);
    return index !== -1 ? this.data[index] : undefined;
  }

  getSupertypeData(): TypeData<T> | SupertypeData<T> {
    return this.default;
  }

  getSupertypeName(): string {
    return this.getSupertypeData().type.name;
  }

  getSubtypesData(): TypeData<T>[] {
    return this.data;
  }

  has(type: string): boolean {
    return type === this.getSupertypeName() || this.types.indexOf(type) !== -1;
  }
}
