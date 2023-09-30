export interface AuditUser {
  id: string | number;
}

export interface Auditable {
  createdAt?: Date;
  createdBy?: AuditUser;
  updatedAt?: Date;
  updatedBy?: AuditUser;
}
