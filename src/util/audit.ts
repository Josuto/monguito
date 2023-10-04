export interface Auditable {
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export abstract class AuditableClass implements Auditable {
  readonly createdAt?: Date;
  readonly createdBy?: string;
  readonly updatedAt?: Date;
  readonly updatedBy?: string;

  constructor(entity: Auditable) {
    this.createdAt = entity.createdAt;
    this.createdBy = entity.createdBy;
    this.updatedAt = entity.updatedAt;
    this.updatedBy = entity.updatedBy;
  }
}

export const isAuditable = (entity: any): entity is Auditable =>
  entity &&
  'createdAt' in entity &&
  'updatedAt' in entity &&
  'createdBy' in entity &&
  'updatedBy' in entity;
