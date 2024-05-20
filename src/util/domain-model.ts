import { Schema } from 'mongoose';
import { Entity } from './entity';
import { IllegalArgumentException } from './exceptions';

/**
 * Models a domain type instance constructor.
 */
export type Constructor<T> = new (...args: any) => T;

/**
 * Models an abstract domain type instance constructor.
 */

export type AbsConstructor<T> = abstract new (...args: any) => T;

/**
 * Models some domain type data.
 */
export interface DomainTypeData<T> {
  type: Constructor<T> | AbsConstructor<T>;
  schema: Schema;
}

/**
 * Models any subtype of a given type.
 */
type InferSubtype<T> = T extends infer S ? S : never;

/**
 * Domain model specification.
 */
export interface DomainModel<T extends Entity> extends DomainTypeData<T> {
  subtypes?: DomainModel<InferSubtype<T>>[];
}

/**
 * Domain model implementation.
 */
export class DomainTree<T extends Entity> implements DomainModel<T> {
  readonly type: Constructor<T> | AbsConstructor<T>;
  readonly schema: Schema<T>;
  readonly subtypeTree?: DomainModel<InferSubtype<T>>[];

  constructor(domainModel: DomainModel<T>) {
    if (!domainModel.type || !domainModel.schema) {
      throw new IllegalArgumentException(
        'The given domain model must specify a type and a schema',
      );
    }
    this.type = domainModel.type;
    this.schema = domainModel.schema;
    this.subtypeTree = [];
    for (const subtypeData of domainModel.subtypes ?? []) {
      this.subtypeTree.push(new DomainTree(subtypeData));
    }
  }

  getSubtypeData(type: string): DomainTypeData<InferSubtype<T>> | undefined {
    const subtypeData = this.subtypeTree?.find(
      (subtype) => subtype.type.name === type,
    );
    if (subtypeData)
      return { type: subtypeData?.type, schema: subtypeData?.schema };
    else return undefined;
  }

  getSupertypeData(): DomainTypeData<T> {
    return {
      type: this.type,
      schema: this.schema,
    };
  }

  getSupertypeName(): string {
    return this.getSupertypeData().type.name;
  }

  getSubtypeTree(): DomainModel<InferSubtype<T>>[] {
    return this.subtypeTree || [];
  }

  has(type: string): boolean {
    return type === this.getSupertypeName() || !!this.getSubtypeData(type);
  }
}
