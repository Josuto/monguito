import { IllegalArgumentException } from './exceptions';

/**
 * Page specification utility class.
 *
 * @property {number} pageNumber the page number to retrieve.
 * @property {number} offset the number of entities composing the result.
 */
export class Pageable {
  readonly pageNumber: number;
  readonly offset: number;

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
 * Specifies some options to narrow down a concrete search operation.
 *
 * @property {any} filters (optional) a MongoDB entity field-based query to filter results.
 * @property {any} sortBy (optional) a MongoDB sort criteria to return results in some sorted order.
 * @property {Pageable} pageable (optional) required data (i.e., page number and offset) to return a particular page of results.
 */
export type SearchOptions = {
  filters?: any;
  sortBy?: any;
  pageable?: Pageable;
};
