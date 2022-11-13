import { Repository } from './repository';
import { Optional } from 'typescript-optional';
import { HydratedDocument, Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { Entity } from '../domain/entity';
import {
  IllegalArgumentException,
  NotFoundException,
  UniquenessViolationException,
} from './exceptions';

@Injectable()
export abstract class MongooseRepository<T extends Entity>
  implements Repository<T>
{
  protected constructor(
    protected readonly elementModel: Model<T>,
    protected readonly type: new (...args: any) => T,
  ) {}

  async deleteById(id: string): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
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
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    const element: T | null = await this.elementModel
      .findById(id)
      .exec()
      .then((document) =>
        document ? new this.type(document.toObject()) : null,
      );
    return Optional.ofNullable(element);
  }

  // An alternative implementation consists of using Mongoose 'save' method. However, since this is
  // an abstract repository implementation, it is not trivial to dynamically set the fields to update.
  // 'findByIdAndUpdate' with 'upsert: true' does not work if element.id is undefined. It's also good
  // that the latter function is atomic, as 'upsert' is set to false by default.
  async save(element: T): Promise<T> {
    if (!element)
      throw new IllegalArgumentException('The given element must be valid');
    let document;
    if (!element.id) {
      document = await this.insert(element);
    } else {
      document = await this.update(element);
    }
    if (document) return new this.type(document.toObject());
    throw new NotFoundException(
      `There is no document matching the given ID ${element.id}`,
    );
  }

  private async insert(element: T): Promise<HydratedDocument<T>> {
    try {
      return await this.elementModel.create(element);
    } catch (error) {
      if (error.message.includes('duplicate key error')) {
        throw new UniquenessViolationException(
          `The given element with ID ${element.id} includes a field which value is expected to be unique`,
        );
      }
      throw error;
    }
  }

  private async update(element: T): Promise<HydratedDocument<T> | null> {
    return await this.elementModel
      .findByIdAndUpdate(
        element.id,
        { ...element },
        { new: true, runValidators: true },
      )
      .exec();
  }
}
