import { Entity } from './entity';

export class Element extends Entity {
  readonly name: string;
  readonly description: string;

  constructor(element: { id?: string; name: string; description: string }) {
    super(element);
    this.name = element.name;
    this.description = element.description;
  }
}
