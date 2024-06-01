import mongoose, {
  Connection,
  HydratedDocument,
  Model,
  UpdateQuery,
} from 'mongoose';
import { Optional } from 'typescript-optional';
import { PartialEntityWithId, Repository } from './repository';
import { isAuditable } from './util/audit';
import { DomainModel, DomainTree } from './util/domain-model';
import { Entity } from './util/entity';
import {
  IllegalArgumentException,
  UndefinedConstructorException,
  ValidationException,
} from './util/exceptions';
import {
  DeleteByIdOptions,
  FindAllOptions,
  FindByIdOptions,
  FindOneOptions,
  SaveOptions,
} from './util/operation-options';

/**
 * Abstract Mongoose-based implementation of the {@link Repository} interface.
 */
export abstract class MongooseRepository<T extends Entity & UpdateQuery<T>>
  implements Repository<T>
{
  private readonly domainTree: DomainTree<T>;
  protected readonly entityModel: Model<T>;

  /**
   * Sets up the underlying configuration to enable database operation execution.
   * @param {DomainModel<T>} domainModel the domain model supported by this repository.
   * @param {Connection=} connection (optional) a MongoDB instance connection.
   */
  protected constructor(
    domainModel: DomainModel<T>,
    protected readonly connection?: Connection,
  ) {
    this.domainTree = new DomainTree(domainModel);
    this.entityModel = this.createEntityModel(connection);
  }

  private createEntityModel(connection?: Connection) {
    let entityModel;
    if (connection) {
      entityModel = connection.model<T>(
        this.domainTree.type.name,
        this.domainTree.schema,
      );
    } else {
      entityModel = mongoose.model<T>(
        this.domainTree.type.name,
        this.domainTree.schema,
      );
    }
    for (const subtypeData of this.domainTree.getSubtypeTree()) {
      entityModel.discriminator(subtypeData.type.name, subtypeData.schema);
    }
    return entityModel;
  }

  /** @inheritdoc */
  async findById<S extends T>(
    id: string,
    options?: FindByIdOptions,
  ): Promise<Optional<S>> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    const document = await this.entityModel
      .findById(id)
      .session(options?.session ?? null)
      .exec();
    return Optional.ofNullable(this.instantiateFrom(document) as S);
  }

  /** @inheritdoc */
  async findOne<S extends T>(options?: FindOneOptions): Promise<Optional<S>> {
    const document = await this.entityModel
      .findOne(options?.filters ?? undefined)
      .session(options?.session ?? null)
      .exec();
    return Optional.ofNullable(this.instantiateFrom(document) as S);
  }

  /** @inheritdoc */
  async findAll<S extends T>(options?: FindAllOptions): Promise<S[]> {
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
        .session(options?.session ?? null)
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
  async save<S extends T>(
    entity: S | PartialEntityWithId<S>,
    options?: SaveOptions,
  ): Promise<S> {
    if (!entity)
      throw new IllegalArgumentException(
        'The given entity cannot be null or undefined',
      );
    try {
      if (!entity.id) {
        return await this.insert(entity as S, options);
      } else {
        return await this.update(entity as PartialEntityWithId<S>, options);
      }
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
   * Inserts an entity.
   * @param {S} entity the entity to insert.
   * @param {SaveOptions=} options (optional) insert operation options.
   * @returns {Promise<S>} the inserted entity.
   * @throws {IllegalArgumentException} if the given entity is `undefined` or `null`.
   */
  protected async insert<S extends T>(
    entity: S,
    options?: SaveOptions,
  ): Promise<S> {
    if (!entity)
      throw new IllegalArgumentException(
        'The given entity cannot be null or undefined',
      );
    const document = this.createDocumentForInsertion(entity, options);
    const insertedDocument = (await document.save({
      session: options?.session,
    })) as HydratedDocument<S>;
    return this.instantiateFrom(insertedDocument) as S;
  }

  private createDocumentForInsertion<S extends T>(
    entity: S,
    options?: SaveOptions,
  ) {
    this.setDiscriminatorKeyOnEntity(entity);
    const document = new this.entityModel(entity);
    this.setAuditableDataOnDocumentToInsert(document, entity, options?.userId);
    return document;
  }

  private setDiscriminatorKeyOnEntity<S extends T>(
    entity: S | PartialEntityWithId<S>,
  ): void {
    const entityClassName = entity['constructor']['name'];
    if (!this.domainTree.has(entityClassName)) {
      throw new IllegalArgumentException(
        `The entity with name ${entityClassName} is not included in the setup of the custom repository`,
      );
    }
    const isSubtype = entityClassName !== this.domainTree.getSupertypeName();
    const hasEntityDiscriminatorKey = '__t' in entity;
    if (isSubtype && !hasEntityDiscriminatorKey) {
      entity['__t'] = entityClassName;
    }
  }

  private setAuditableDataOnDocumentToInsert<S extends T>(
    document: HydratedDocument<S>,
    entity: S,
    userId?: string,
  ): void {
    if (isAuditable(entity)) {
      if (userId) document.$locals.userId = userId;
      document.__v = 0;
    }
  }

  /**
   * Updates an entity.
   * @param {S} entity the entity to update.
   * @param {SaveOptions=} options (optional) update operation options.
   * @returns {Promise<S>} the updated entity.
   * @throws {IllegalArgumentException} if the given entity is `undefined` or `null` or specifies an `id` not matching any existing entity.
   */
  protected async update<S extends T>(
    entity: PartialEntityWithId<S>,
    options?: SaveOptions,
  ): Promise<S> {
    if (!entity)
      throw new IllegalArgumentException('The given entity must be valid');
    const document = await this.entityModel
      .findById<HydratedDocument<S>>(entity.id)
      .session(options?.session ?? null);
    if (document) {
      document.set(entity);
      this.setAuditableDataOnDocumentToUpdate(document, options?.userId);
      const updatedDocument = (await document.save({
        session: options?.session,
      })) as HydratedDocument<S>;
      return this.instantiateFrom(updatedDocument) as S;
    }
    throw new IllegalArgumentException(
      `There is no document matching the given ID '${entity.id}'`,
    );
  }

  private setAuditableDataOnDocumentToUpdate<S extends T>(
    document: HydratedDocument<S>,
    userId?: string,
  ): void {
    document.isNew = false;
    if (isAuditable(document)) {
      if (userId) document.$locals.userId = userId;
      document.__v = (document.__v ?? 0) + 1;
    }
  }

  /** @inheritdoc */
  async deleteById(id: string, options?: DeleteByIdOptions): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    const isDeleted = await this.entityModel.findByIdAndDelete(id, {
      session: options?.session,
    });
    return !!isDeleted;
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
    const entityKey = document.get('__t');
    const constructor = entityKey
      ? this.domainTree.getSubtypeConstructor(entityKey)
      : this.domainTree.getSupertypeConstructor();
    if (constructor) {
      // safe instantiation as no abstract class instance can be stored in the first place
      return new constructor(document.toObject()) as S;
    }
    throw new UndefinedConstructorException(
      `There is no registered instance constructor for the document with ID ${document.id} or the constructor is abstract`,
    );
  }
}
