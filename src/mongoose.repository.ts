import mongoose, {
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
} from './util/exceptions';
import { SearchOptions } from './util/search-options';

type Constructor<T> = new (...args: any) => T;

interface ConstructorMap<T> {
  [index: string]: { type: Constructor<T>; schema: Schema };
}

type PartialEntityWithIdAndOptionalDiscriminatorKey<T> = { id: string } & {
  __t?: string;
} & Partial<T>;

/**
 * Abstract implementation of the {@link Repository} interface for MongoDB using Mongoose.
 */
export abstract class MongooseRepository<T extends Entity & UpdateQuery<T>>
  implements Repository<T>
{
  protected readonly entityModel: Model<T>;

  /**
   * Sets up the underlying configuration to enable Mongoose operation execution.
   *
   * @param entityConstructorMap a map with all the persistable domain object types.
   * @param connection (optional) a Mongoose connection to an instance of MongoDB.
   */
  protected constructor(
    private readonly entityConstructorMap: ConstructorMap<T>,
    private readonly connection?: Connection,
  ) {
    this.entityModel = this.createEntityModel(entityConstructorMap, connection);
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
      return this.entityModel
        .find(options?.filters)
        .skip(pageNumber > 0 ? (pageNumber - 1) * offset : 0)
        .limit(offset)
        .sort(options?.sortBy)
        .exec()
        .then((documents) =>
          documents.map((document) => this.instantiateFrom(document) as S),
        );
    } catch (error) {
      throw new IllegalArgumentException(
        'The given optional parameters must be valid',
      );
    }
  }

  /** @inheritdoc */
  async findById<S extends T>(id: string): Promise<Optional<S>> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    return this.entityModel
      .findById(id)
      .exec()
      .then((document) =>
        Optional.ofNullable(this.instantiateFrom(document) as S),
      );
  }

  /** @inheritdoc */
  async save<S extends T>(
    entity: S | PartialEntityWithIdAndOptionalDiscriminatorKey<S>,
    userId?: string,
  ): Promise<S> {
    if (!entity)
      throw new IllegalArgumentException('The given entity must be valid');
    let document;
    if (!entity.id) {
      document = await this.insert(entity as S, userId);
    } else {
      document = await this.update(
        entity as PartialEntityWithIdAndOptionalDiscriminatorKey<S>,
        userId,
      );
    }
    if (document) return this.instantiateFrom(document) as S;
    throw new IllegalArgumentException(
      `There is no document matching the given ID ${entity.id}. New entities cannot not specify an ID`,
    );
  }

  /**
   * Instantiates a persistable domain object from the given Mongoose Document.
   *
   * @param document the given Mongoose Document.
   * @returns the resulting persistable domain object instance.
   */
  protected instantiateFrom<S extends T>(
    document: HydratedDocument<S> | null,
  ): S | null {
    if (!document) return null;
    const discriminatorType = document.get('__t');
    const entityConstructor =
      this.entityConstructorMap[discriminatorType ?? 'Default'].type;
    if (entityConstructor) {
      return new entityConstructor(document.toObject()) as S;
    }
    throw new UndefinedConstructorException(
      `There is no registered instance constructor for the document with ID ${document.id}`,
    );
  }

  private createEntityModel<T>(
    entityConstructorMap: ConstructorMap<T>,
    connection?: Connection,
  ) {
    let entityModel;
    const supertypeName = entityConstructorMap['Default'].type.name;
    const supertypeSchema = entityConstructorMap['Default'].schema;
    if (connection) {
      entityModel = connection.model<T>(supertypeName, supertypeSchema);
    } else {
      entityModel = mongoose.model<T>(supertypeName, supertypeSchema);
    }
    for (const subtypeName in entityConstructorMap) {
      if (!(subtypeName === 'Default')) {
        const subtypeSchema = entityConstructorMap[subtypeName].schema;
        entityModel.discriminator(subtypeName, subtypeSchema);
      }
    }
    return entityModel;
  }

  private async insert<S extends T>(
    entity: S,
    userId?: string,
  ): Promise<HydratedDocument<S>> {
    try {
      this.setDiscriminatorKeyOn(entity);
      const document = this.createDocumentAndSetUserId(entity, userId);
      return (await document.save()) as HydratedDocument<S>;
    } catch (error) {
      if (error.message.includes('duplicate key error')) {
        throw new IllegalArgumentException(
          `The given entity with ID ${entity.id} includes a field which value is expected to be unique`,
        );
      }
      throw error;
    }
  }

  private setDiscriminatorKeyOn<S extends T>(
    entity: S | PartialEntityWithIdAndOptionalDiscriminatorKey<S>,
  ): void {
    const entityClassName = entity['constructor']['name'];
    const hasEntityDiscriminatorKey = '__t' in entity;
    const isEntitySupertype =
      entityClassName !== this.entityConstructorMap['Default'].type.name;
    if (!hasEntityDiscriminatorKey && isEntitySupertype) {
      entity['__t'] = entityClassName;
    }
  }

  private createDocumentAndSetUserId<S extends T>(entity: S, userId?: string) {
    const document = new this.entityModel(entity);
    if (isAuditable(entity) && userId) {
      document.$locals.userId = userId;
    }
    return document;
  }

  private async update<S extends T>(
    entity: PartialEntityWithId<S>,
    userId?: string,
  ): Promise<HydratedDocument<S> | null> {
    const document = await this.entityModel.findById<HydratedDocument<S>>(
      entity.id,
    );
    if (document) {
      document.set(entity);
      document.isNew = false;
      if (isAuditable(document) && userId) {
        document.$locals.userId = userId;
      }
      return (await document.save()) as HydratedDocument<S>;
    }
    return null;
  }
}
