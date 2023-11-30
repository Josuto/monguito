/**
 * Models a persistable domain object. Any domain object that implements this interface must specify some database `id`.
 */
export interface Entity {
  id?: string;
}
