import { Repository } from './repository';
import { Optional } from 'typescript-optional';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { Entity } from '../domain/Entity';

@Injectable()
export abstract class MongoRepository<T extends Entity>
  implements Repository<T>
{
  protected constructor(
    protected readonly elementModel: Model<T>,
    protected readonly type: new (...args: any) => T,
  ) {}

  async deleteById(id: string): Promise<boolean> {
    if (!id) throw new Error('The given element ID must be valid');
    const isDeleted = await this.elementModel.findByIdAndDelete(id);
    return !!isDeleted;
  }

  async findAll(): Promise<T[]> {
    return this.elementModel
      .find()
      .exec()
      .then((documents) =>
        documents.map((document) => new this.type(document.toObject())),
      );
  }

  async findById(id: string): Promise<Optional<T>> {
    if (!id) throw new Error('The given element ID must be valid');
    const element: T | null = await this.elementModel
      .findById(id)
      .exec()
      .then((document) =>
        document ? new this.type(document.toObject()) : null,
      );
    return Optional.ofNullable(element);
  }

  // An alternative implementation consists of using Mongoose 'save' method. However, since this is
  // an abstract repository implementation, it is not trivial dynamically set the fields to update.
  // 'findByIdAndUpdate' with 'upsert: true' does not work if element.id is undefined.
  async save(element: T): Promise<T> {
    if (!element) throw new Error('The given element must be valid');
    let document;
    if (!element.id) {
      document = await this.elementModel.create(element);
    } else {
      document = await this.elementModel
        .findByIdAndUpdate(
          element.id,
          { ...element },
          { new: true, runValidators: true },
        )
        .exec();
    }
    if (document) return new this.type(document.toObject());
    throw Error(`There is no document matching the given ID ${element.id}`);
  }
}
