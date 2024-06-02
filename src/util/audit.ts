/**
 * Models an auditable persistable domain object.
 * @property {Date} createdAt - the date and time when the entity was created.
 * @property {string} createdBy - the user who created the entity.
 * @property {Date} updatedAt - the date and time when the entity was last updated.
 * @property {string} updatedBy - the user who last updated the entity.
 * @property {number} version - the version of the entity.
 */
export interface Auditable {
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
  version?: number;
}

/**
 * Utility class designed to ease the definition of {@link Auditable} persistable domain objects.
 */
export abstract class AuditableClass implements Auditable {
  readonly createdAt?: Date;
  readonly createdBy?: string;
  readonly updatedAt?: Date;
  readonly updatedBy?: string;
  readonly version?: number;

  /**
   * Creates an auditable persistable domain object instance.
   * @param {Auditable} entity the entity to create the auditable persistable domain object from.
   */
  constructor(entity: Auditable) {
    this.createdAt = entity.createdAt ? new Date(entity.createdAt) : undefined;
    this.createdBy = entity.createdBy;
    this.updatedAt = entity.updatedAt ? new Date(entity.updatedAt) : undefined;
    this.updatedBy = entity.updatedBy;
    this.version = entity.version;
  }
}

/**
 * Determines whether a given domain object is {@link Auditable}.
 *
 * @param {any} entity the entity to evaluate.
 * @returns {boolean} `true` if the given entity is auditable, `false` otherwise.
 */
export const isAuditable = (entity: any): entity is Auditable =>
  entity &&
  'createdAt' in entity &&
  'updatedAt' in entity &&
  'createdBy' in entity &&
  'updatedBy' in entity;
