import { PartialEntityWithId, Repository } from './repository';
import { Entity } from './util/entity';

/**
 * Specifies a list of common database CRUD operations that must execute in a database transaction.
 */
export interface TransactionalRepository<T extends Entity>
  extends Repository<T> {
  /**
   * Saves (insert or update) a list of entities.
   * @param {S[] | PartialEntityWithId<S>[]} entities the list of entities to save.
   * @param {string} userId (optional) the ID of the user executing the action.
   * @returns {Promise<S[]>} the list of saved entities.
   * @throws {IllegalArgumentException} if any of the given entities is `undefined` or `null` or
   * specifies an `id` not matching any existing entity.
   * @throws {ValidationException} if any of the given entities specifies a field with some invalid value.
   */
  saveAll: <S extends T>(
    entities: (S | PartialEntityWithId<S>)[],
    userId?: string,
  ) => Promise<S[]>;
}
