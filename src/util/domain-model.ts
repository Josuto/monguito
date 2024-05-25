import { Schema } from 'mongoose';
import { Entity } from './entity';
import { IllegalArgumentException } from './exceptions';

/**
 * Models a domain type instance constructor.
 */
type Constructor<T> = new (...args: any) => T;

/**
 * Models an abstract domain type instance constructor.
 */
type AbsConstructor<T> = abstract new (...args: any) => T;

/**
 * Models some domain type data.
 */
type DomainTypeData<T> = {
  type: Constructor<T> | AbsConstructor<T>;
  schema: Schema;
};

/**
 * Models some domain leaf type data.
 */
type DomainLeafTypeData<T> = { type: Constructor<T>; schema: Schema };

/**
 * Models some domain intermediate type data.
 */
type DomainIntermediateTypeData<T> = {
  type: Constructor<T> | AbsConstructor<T>;
  schema: Schema;
  subtypes: (DomainIntermediateTypeData<T> | DomainLeafTypeData<T>)[];
};

/**
 * Domain model specification.
 */
export interface DomainModel<T extends Entity> extends DomainTypeData<T> {
  subtypes?: (DomainIntermediateTypeData<T> | DomainLeafTypeData<T>)[];
}

/**
 * Domain model implementation.
 */
export class DomainTree<T extends Entity> implements DomainModel<T> {
  readonly type: Constructor<T> | AbsConstructor<T>;
  readonly schema: Schema;
  readonly subtypes: (DomainIntermediateTypeData<T> | DomainLeafTypeData<T>)[];

  constructor(domainModel: DomainModel<T>) {
    if (!domainModel.type || !domainModel.schema) {
      throw new IllegalArgumentException(
        'The given domain model must specify a type and a schema',
      );
    }
    this.type = domainModel.type;
    this.schema = domainModel.schema;
    this.subtypes = [];
    for (const subtypeData of domainModel.subtypes ?? []) {
      this.subtypes.push(new DomainTree(subtypeData));
    }
  }

  getSubtypeData(type: string): DomainTypeData<T> | undefined {
    const subtypeData = this.subtypes?.find(
      (subtype) => subtype.type.name === type,
    );
    if (subtypeData)
      return { type: subtypeData?.type, schema: subtypeData?.schema };
    else return undefined;
  }

  getSubtypeConstructor(type: string): Constructor<T> | undefined {
    const subtypeData = this.getSubtypeData(type);
    return subtypeData?.type as Constructor<T>;
  }

  getSupertypeData(): DomainTypeData<T> {
    return {
      type: this.type,
      schema: this.schema,
    };
  }

  getSupertypeConstructor(): Constructor<T> | undefined {
    return this.type as Constructor<T>;
  }

  getSupertypeName(): string {
    return this.getSupertypeData().type.name;
  }

  getSubtypeTree(): DomainModel<T>[] {
    return this.subtypes || [];
  }

  has(type: string): boolean {
    return type === this.getSupertypeName() || !!this.getSubtypeData(type);
  }
}
