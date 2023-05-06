export interface Entity {
  id?: string;
}
export interface PolymorphicEntity extends Entity {
  __t: string;
}
