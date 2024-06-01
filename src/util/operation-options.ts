import { FilterQuery } from 'mongoose';
import { IllegalArgumentException } from './exceptions';
import { TransactionOptions } from './transaction';

/**
 * Specifies options required to perform audit on side effect operation execution.
 * @property {string=} userId (optional) the id of the user performing the operation.
 */
export type AuditOptions = {
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

export type SortOrder = {
  [key: string]: 'asc' | 'desc' | 'ascending' | 'descending' | 1 | -1;
};

/**
 * Specifies options for the `findAll` operation.
 * @property {FilterQuery=} filters (optional) some filters for the search.
 * @property {string | SortOrder=} sortBy (optional) the sorting criteria for the search.
 * @property {Pageable=} pageable (optional) paging configuration.
 */
export type FindAllOptions<T> = {
  filters?: FilterQuery<T>;
  sortBy?: string | SortOrder;
  pageable?: Pageable;
} & TransactionOptions;

/**
 * Specifies options for the `findById` operation;
 */
export type FindByIdOptions = TransactionOptions;

/**
 * Specifies options for the `findOne` operation;
 */
export type FindOneOptions<T> = {
  filters?: FilterQuery<T>;
} & TransactionOptions;

/**
 * Specifies options for the `save` operation.
 */
export type SaveOptions = AuditOptions & TransactionOptions;

/**
 * Specifies options for the `saveAll` operation.
 */
export type SaveAllOptions = AuditOptions & TransactionOptions;

/**
 * Specifies options for the `deleteAll` operation.
 * @property {FilterQuery=} filters (optional) a MongoDB query object to select the entities to be deleted.
 */
export type DeleteAllOptions<T> = {
  filters?: FilterQuery<T>;
} & TransactionOptions;

/**
 * Specifies options for the `deleteById` operation;
 */
export type DeleteByIdOptions = TransactionOptions;
