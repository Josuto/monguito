import { ClientSession } from 'mongoose';
import { IllegalArgumentException } from './exceptions';

/**
 * Specifies options required to peform transactional operations.
 */
type TransactionOptions = {
  /**
   * (optional) A Mongoose session required in operations to run within a transaction.
   * @type {ClientSession}
   */
  session?: ClientSession;
};

/**
 * Specifies options required to perform audit on side effect operation execution.
 */
type AuditOptions = {
  /**
   * (Optional) The id of the user performing the operation.
   * @type {string}
   */
  userId?: string;
};

/**
 * Page specification utility class.
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
 * @property {Pageable=} pageable
 */
export type SearchOptions = {
  /**
   * (Optional) A MongoDB entity field-based query to filter results.
   * @type {any}
   */
  filters?: any;

  /**
   * (Optional) A MongoDB sort criteria to return results in some sorted order.
   * @type {any}
   */
  sortBy?: any;

  /**
   * (Optional) Page-related options.
   * @type {Pageable}
   */
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
 */
export type DeleteAllOptions = {
  /**
   * (Optional) A MongoDB query object to select the entities to be deleted.
   * @type {any}
   */
  filters?: any;
};
