import { PartialEntityWithId, Repository } from './repository';
import { Entity } from './util/entity';
import { DeleteAllOptions, SaveAllOptions } from './util/operation-options';

/**
 * Specifies a list of common database CRUD operations that must execute in a database transaction.
 */
export interface TransactionalRepository<T extends Entity>
  extends Repository<T> {
  /**
   * Saves (insert or update) a list of entities.
   * @param {S[] | PartialEntityWithId<S>[]} entities the list of entities to save.
   * @param {SaveAllOptions} options (optional) save operation options.
   * @returns {Promise<S[]>} the list of saved entities.
   * @throws {IllegalArgumentException} if any of the given entities is `undefined` or `null` or
   * (when update) specifies an `id` not matching any existing entity.
   * @throws {InstantiationException} if the entity constructor throws an exception.
   * @throws {UndefinedConstructorException} if there is no available entity constructor.
   * @throws {ValidationException} if any of the given entities specifies a field with some invalid value.
   * @see {@link SaveAllOptions}
   */
  saveAll: <S extends T>(
    entities: (S | PartialEntityWithId<S>)[],
    options?: SaveAllOptions,
  ) => Promise<S[]>;

  /**
   * Deletes all the entities that match the given filter, if any. No filter specification will
   * result in the deletion of all entities.
   * @param {DeleteAllOptions} options (optional) delete operation options.
   * @returns {number} the number of deleted entities.
   * @see {@link DeleteAllOptions}
   */
  deleteAll: <S extends T>(options?: DeleteAllOptions<S>) => Promise<number>;
}
