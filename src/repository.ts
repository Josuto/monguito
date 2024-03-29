import { Optional } from 'typescript-optional';
import { Entity } from './util/entity';
import { SaveOptions, SearchOptions } from './util/operation-options';

/**
 * Models an entity with partial content that specifies a Mongo `id` and (optionally) a Mongoose discriminator key.
 */
export type PartialEntityWithId<T extends Entity> = {
  id: string;
} & {
  __t?: string;
} & Partial<T>;

/**
 * Specifies a list of common database CRUD operations.
 */
export interface Repository<T extends Entity> {
  /**
   * Finds an entity by ID.
   * @param {string} id the ID of the entity.
   * @returns {Promise<Optional<S>>} the entity or null.
   * @throws {IllegalArgumentException} if the given `id` is `undefined` or `null`.
   */
  findById: <S extends T>(id: string) => Promise<Optional<S>>;

  /**
   * Finds all entities.
   * @param {SearchOptions} options (optional) search operation options.
   * @returns {Promise<S[]>} all entities.
   * @throws {IllegalArgumentException} if the given `options` specifies an invalid parameter.
   */
  findAll: <S extends T>(options?: SearchOptions) => Promise<S[]>;

  /**
   * Saves (insert or update) an entity.
   * @param {S | PartialEntityWithId<S>} entity the entity to save.
   * @param {string=} userId DEPRECATED! use 'options.userId' instead. (optional) the ID of the user executing the action.
   * @param {SaveOptions=} options (optional) save operation options.
   * @returns {Promise<S>} the saved entity.
   * @throws {IllegalArgumentException} if the given entity is `undefined` or `null` or
   * specifies an `id` not matching any existing entity.
   * @throws {ValidationException} if the given entity specifies a field with some invalid value.
   */
  save: <S extends T>(
    entity: S | PartialEntityWithId<S>,
    /**
     * @deprecated This property is deprecated. Use 'options.userId' instead.
     */
    userId?: string,
    options?: SaveOptions,
  ) => Promise<S>;

  /**
   * Deletes an entity by ID.
   * @param {string} id the ID of the entity.
   * @returns {Promise<boolean>} `true` if the entity was deleted, `false` otherwise.
   * @throws {IllegalArgumentException} if the given `id` is `undefined` or `null`.
   */
  deleteById: (id: string) => Promise<boolean>;
}
