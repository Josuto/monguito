export abstract class Entity {
  id?: string;

  protected constructor(entity: { id?: string }) {
    this.id = entity.id;
  }
}
