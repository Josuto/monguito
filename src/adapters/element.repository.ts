import { MongoRepository } from './mongo.repository';
import { Element } from '../domain/element';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from './repository';
import { BaseSchema, extendSchema } from './mongoose.base-schema';

export const ElementSchema = extendSchema(BaseSchema, {
  name: { type: String, required: true },
  description: { type: String, required: false },
});
export type ElementRepository = Repository<Element>;

export class MongoElementRepository
  extends MongoRepository<Element>
  implements ElementRepository
{
  constructor(
    @InjectModel(Element.name)
    protected elementModel: Model<Element>,
  ) {
    super(elementModel, Element);
  }
}
