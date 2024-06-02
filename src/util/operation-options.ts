import { FilterQuery } from 'mongoose';
import { IllegalArgumentException } from './exceptions';
import { TransactionOptions } from './transaction';

/**
 * Specifies options required to perform audit on side effect operation execution.
 * @property {string} userId (optional) - the id of the user performing the operation.
 */
export interface AuditOptions {
  userId?: string;
}

/**
 * Specifies paging configuration for search operations.
 */
export class Pageable {
  /**
   * The page number to retrieve.
   */
  readonly pageNumber: number;

  /**
   * The number of entities composing the result.
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
 * Specifies the sorting criteria for search operations. The allowed values are: 'asc', 'ascending', 'desc', 'descending', 1, -1.
 */
export interface SortOrder {
  [key: string]: 'asc' | 'desc' | 'ascending' | 'descending' | 1 | -1;
}

/**
 * Specifies options for the `findAll` operation.
 * @property {FilterQuery} filters (optional) - MongoDB search filters.
 * @property {string|SortOrder} sortBy (optional) - the sorting criteria for the search.
 * @property {Pageable} pageable (optional) - paging configuration.
 * @see {@link TransactionOptions}
 */
export interface FindAllOptions<T> extends TransactionOptions {
  filters?: FilterQuery<T>;
  sortBy?: string | SortOrder;
  pageable?: Pageable;
}

/**
 * Specifies options for the `findById` operation;
 * @see {@link TransactionOptions}
 */
export interface FindByIdOptions extends TransactionOptions {}

/**
 * Specifies options for the `findOne` operation;
 * @property {FilterQuery} filters (optional) - MongoDB search filters.
 * @see {@link TransactionOptions}
 */
export interface FindOneOptions<T> extends TransactionOptions {
  filters?: FilterQuery<T>;
}

/**
 * Specifies options for the `save` operation.
 * @see {@link AuditOptions}
 * @see {@link TransactionOptions}
 */
export interface SaveOptions extends AuditOptions, TransactionOptions {}

/**
 * Specifies options for the `saveAll` operation.
 * @see {@link AuditOptions}
 * @see {@link TransactionOptions}
 */
export interface SaveAllOptions extends AuditOptions, TransactionOptions {}

/**
 * Specifies options for the `deleteAll` operation.
 * @property {FilterQuery} filters (optional) - MongoDB search filters.
 * @see {@link TransactionOptions}
 */
export interface DeleteAllOptions<T> extends TransactionOptions {
  filters?: FilterQuery<T>;
}

/**
 * Specifies options for the `deleteById` operation.
 * @see {@link TransactionOptions}
 */
export interface DeleteByIdOptions extends TransactionOptions {}
