import { ClientSession } from 'mongoose';
import { IllegalArgumentException } from './exceptions';

/**
 * Specifies options required to peform transactional operations.
 * @property {ClientSession=} session (optional) a Mongoose session required in operations to run within a transaction.
 */
type TransactionOptions = {
  session?: ClientSession;
};

/**
 * Specifies options required to perform audit on side effect operation execution.
 * @property {string=} userId (optional) the id of the user performing the operation.
 */
type AuditOptions = {
  userId?: string;
};

/**
 * Specifies paging configuration for search operations.
 */
export class Pageable {
  /**
   * The page number to retrieve.
   * @type {number}
   */
  readonly pageNumber: number;

  /**
   * The number of entities composing the result.
   * @type {number}
   */
  readonly offset: number;

  /**
   * Creates a pageable instance.
   * @param {Pageable} pageable the instance to create the pageable from.
   * @throws {IllegalArgumentException} if the given instance does not specify a page number and an offset.
   */
  constructor(pageable: Pageable) {
    if (!pageable.pageNumber) {
      throw new IllegalArgumentException(
        'A value for the page number is missing',
      );
    }
    if (!pageable.offset) {
      throw new IllegalArgumentException('A value for the offset is missing');
    }
    this.pageNumber = pageable.pageNumber;
    this.offset = pageable.offset;
  }
}

/**
 * Specifies options for the `findAll` operation.
 * @property {any=} filters (optional) filters for the search.
 * @property {any=} sortBy (optional) sorting criteria for the search.
 * @property {Pageable=} pageable (optional) paging configuration.
 */
export type SearchOptions = {
  filters?: any;
  sortBy?: any;
  pageable?: Pageable;
};

/**
 * Specifies options for the `save` operation.
 */
export type SaveOptions = AuditOptions & TransactionOptions;

/**
 * Specifies options for the `saveAll` operation.
 */
export type SaveAllOptions = AuditOptions;

/**
 * Specifies options for the `deleteAll` operation.
 * @property {any=} filters (optional) a MongoDB query object to select the entities to be deleted.
 */
export type DeleteAllOptions = {
  filters?: any;
};
