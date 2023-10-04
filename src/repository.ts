import { Entity } from './util/entity';
import { Optional } from 'typescript-optional';

export type PartialEntityWithId<T> = { id: string } & Partial<T>;

export interface Repository<T extends Entity> {
  /**
   * Find an entity by ID.
   * @param id the ID of the entity.
   * @returns an Optional specifying the entity or null.
   * */
  findById: <S extends T>(id: string) => Promise<Optional<S>>;

  /**
   * Find all entities.
   * @param filters some combination of entity property values to filter the result.
   * @param sortBy some entity property to sort the result.
   * */
  findAll: <S extends T>(filters?: any, sortBy?: any) => Promise<S[]>;

  /**
   * Save (insert or update) an entity.
   * @param entity the entity to save.
   * @param userId the ID of the user executing the action.
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
