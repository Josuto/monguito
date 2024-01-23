import mongoose, {
  ClientSession,
  Connection,
  HydratedDocument,
  Model,
  Schema,
  UpdateQuery,
} from 'mongoose';
import { Optional } from 'typescript-optional';
import { PartialEntityWithId, Repository } from './repository';
import { isAuditable } from './util/audit';
import { Entity } from './util/entity';
import {
  IllegalArgumentException,
  UndefinedConstructorException,
  ValidationException,
} from './util/exceptions';
import { SearchOptions } from './util/search-options';

/**
 * Models a domain object instance constructor.
 */
export type Constructor<T extends Entity> = new (...args: any) => T;

/**
 * Models some domain object type data.
 */
export type TypeData<T extends Entity> = {
  type: Constructor<T>;
  schema: Schema;
};

/**
 * Models a map of domain object types supported by a custom repository.
 */
export interface TypeMap<T extends Entity> {
  [type: string]: TypeData<T>;
}

class InnerTypeMap<T extends Entity> {
  readonly types: string[];
  readonly data: TypeData<T>[];

  constructor(map: TypeMap<T>) {
    this.types = Object.keys(map);
    this.data = Object.values(map);
  }

  get(type: string): TypeData<T> | undefined {
    const index = this.types.indexOf(type);
    return index !== -1 ? this.data[index] : undefined;
  }

  getSupertypeData(): TypeData<T> | undefined {
    return this.get('Default');
  }

  getSupertypeName(): string | undefined {
    return this.getSupertypeData()?.type.name;
  }

  getSubtypesData(): TypeData<T>[] {
    const subtypeData: TypeData<T>[] = [];
    for (const key of this.types) {
      const value = this.get(key);
      if (value && key !== 'Default') {
        subtypeData.push(value);
      }
    }
    return subtypeData;
  }

  has(type: string): boolean {
    return type === this.getSupertypeName() || this.types.indexOf(type) !== -1;
  }
}

/**
 * Abstract Mongoose-based implementation of the {@link Repository} interface.
 */
export abstract class MongooseRepository<T extends Entity & UpdateQuery<T>>
  implements Repository<T>
{
  private readonly typeMap: InnerTypeMap<T>;
  protected readonly entityModel: Model<T>;

  /**
   * Sets up the underlying configuration to enable database operation execution.
   * @param {TypeMap<T>} typeMap a map of domain object types supported by this repository.
   * @param {Connection=} connection (optional) a connection to an instance of MongoDB.
   */
  protected constructor(
    typeMap: TypeMap<T>,
    protected readonly connection?: Connection,
  ) {
    this.typeMap = new InnerTypeMap(typeMap);
    this.entityModel = this.createEntityModel(connection);
  }

  /** @inheritdoc */
  async deleteById(id: string): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    const isDeleted = await this.entityModel.findByIdAndDelete(id);
    return !!isDeleted;
  }

  /** @inheritdoc */
  async findAll<S extends T>(options?: SearchOptions): Promise<S[]> {
    if (options?.pageable?.pageNumber && options?.pageable?.pageNumber < 0) {
      throw new IllegalArgumentException(
        'The given page number must be a positive number',
      );
    }
    if (options?.pageable?.offset && options?.pageable?.offset < 0) {
      throw new IllegalArgumentException(
        'The given page offset must be a positive number',
      );
    }

    const offset = options?.pageable?.offset ?? 0;
    const pageNumber = options?.pageable?.pageNumber ?? 0;
    try {
      const documents = await this.entityModel
        .find(options?.filters)
        .skip(pageNumber > 0 ? (pageNumber - 1) * offset : 0)
        .limit(offset)
        .sort(options?.sortBy)
        .exec();
      return documents.map((document) => this.instantiateFrom(document) as S);
    } catch (error) {
      throw new IllegalArgumentException(
        'The given optional parameters must be valid',
        error,
      );
    }
  }

  /** @inheritdoc */
  async findById<S extends T>(id: string): Promise<Optional<S>> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    const document = await this.entityModel.findById(id).exec();
    return Optional.ofNullable(this.instantiateFrom(document) as S);
  }

  /** @inheritdoc */
  async save<S extends T>(
    entity: S | PartialEntityWithId<S>,
    userId?: string,
    session?: ClientSession,
  ): Promise<S> {
    if (!entity)
      throw new IllegalArgumentException('The given entity must be valid');
    try {
      let document;
      if (!entity.id) {
        document = await this.insert(entity as S, userId, session);
      } else {
        document = await this.update(
          entity as PartialEntityWithId<S>,
          userId,
          session,
        );
      }
      if (document) return this.instantiateFrom(document) as S;
      throw new IllegalArgumentException(
        `There is no document matching the given ID '${entity.id}'. New entities cannot not specify an ID`,
      );
    } catch (error) {
      if (
        error.message.includes('validation failed') ||
        error.message.includes('duplicate key error')
      ) {
        throw new ValidationException(
          'One or more fields of the given entity do not specify valid values',
          error,
        );
      }
      throw error;
    }
  }

  /**
   * Instantiates a persistable domain object from the given Mongoose Document.
   * @param {HydratedDocument<S> | null} document the given Mongoose Document.
   * @returns {S | null} the resulting persistable domain object instance.
   * @throws {UndefinedConstructorException} if there is no constructor available.
   */
  protected instantiateFrom<S extends T>(
    document: HydratedDocument<S> | null,
  ): S | null {
    if (!document) return null;
    const entityKey = document.get('__t') ?? 'Default';
    const constructor = this.typeMap.get(entityKey)?.type;
    if (constructor) {
      return new constructor(document.toObject()) as S;
    }
    throw new UndefinedConstructorException(
      `There is no registered instance constructor for the document with ID ${document.id}`,
    );
  }

  private createEntityModel(connection?: Connection) {
    let entityModel;
    const supertypeData = this.typeMap.getSupertypeData();
    if (!supertypeData)
      throw new UndefinedConstructorException(
        'No super type constructor is registered',
      );
    if (connection) {
      entityModel = connection.model<T>(
        supertypeData.type.name,
        supertypeData.schema,
      );
    } else {
      entityModel = mongoose.model<T>(
        supertypeData.type.name,
        supertypeData.schema,
      );
    }
    for (const subtypeData of this.typeMap.getSubtypesData()) {
      entityModel.discriminator(subtypeData.type.name, subtypeData.schema);
    }
    return entityModel;
  }

  private async insert<S extends T>(
    entity: S,
    userId?: string,
    session?: ClientSession,
  ): Promise<HydratedDocument<S>> {
    const entityClassName = entity['constructor']['name'];
    if (!this.typeMap.has(entityClassName)) {
      throw new IllegalArgumentException(
        `The entity with name ${entityClassName} is not included in the setup of the custom repository`,
      );
    }
    this.setDiscriminatorKeyOn(entity);
    const document = this.createDocumentAndSetUserId(entity, userId);
    return (await document.save({ session })) as HydratedDocument<S>;
  }

  private setDiscriminatorKeyOn<S extends T>(
    entity: S | PartialEntityWithId<S>,
  ): void {
    const entityClassName = entity['constructor']['name'];
    const isSubtype = entityClassName !== this.typeMap.getSupertypeName();
    const hasEntityDiscriminatorKey = '__t' in entity;
    if (isSubtype && !hasEntityDiscriminatorKey) {
      entity['__t'] = entityClassName;
    }
  }

  private createDocumentAndSetUserId<S extends T>(entity: S, userId?: string) {
    const document = new this.entityModel(entity);
    if (isAuditable(entity)) {
      if (userId) document.$locals.userId = userId;
      document.__v = 0;
    }
    return document;
  }

  private async update<S extends T>(
    entity: PartialEntityWithId<S>,
    userId?: string,
    session?: ClientSession,
  ): Promise<HydratedDocument<S> | null> {
    const document = await this.entityModel
      .findById<HydratedDocument<S>>(entity.id)
      .session(session ?? null);
    if (document) {
      document.set(entity);
      document.isNew = false;
      if (isAuditable(document)) {
        if (userId) document.$locals.userId = userId;
        document.__v = (document.__v ?? 0) + 1;
      }
      return (await document.save()) as HydratedDocument<S>;
    }
    return null;
  }
}
