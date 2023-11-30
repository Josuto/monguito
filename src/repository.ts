import { Optional } from 'typescript-optional';
import { Entity } from './util/entity';
import { SearchOptions } from './util/search-options';

export type PartialEntityWithId<T> = { id: string } & Partial<T>;

/**
 * Specifies a list of common database CRUD operations.
 */
export interface Repository<T extends Entity> {
  /**
   * Find an entity by ID.
   * @param id the ID of the entity.
   * @returns the entity or null.
   * */
  findById: <S extends T>(id: string) => Promise<Optional<S>>;

  /**
   * Find all entities.
   * @param options (optional) the desired search options (i.e., field filters, sorting, and pagination data).
   * */
  findAll: <S extends T>(options?: SearchOptions) => Promise<S[]>;

  /**
   * Save (insert or update) an entity.
   * @param entity the entity to save.
   * @param userId (optional) the ID of the user executing the action.
   * @returns the saved version of the entity.
   */
  save: <S extends T>(
    entity: S | PartialEntityWithId<S>,
    userId?: string,
  ) => Promise<S>;

  /**
   * Delete an entity by ID.
   * @param id the ID of the entity.
   * @returns true if the entity was deleted, false otherwise.
   */
  deleteById: (id: string) => Promise<boolean>;
}
