import { Repository } from './repository';
import { Optional } from 'typescript-optional';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class RepositoryImpl<T> implements Repository<T> {
  protected constructor(
    protected readonly elementModel: Model<T>,
    protected readonly type: new (...args: any) => T,
  ) {}

  deleteById(id: string): boolean {
    return false;
  }

  findAll(): T[] {
    return [];
  }

  async findById(id: string): Promise<Optional<T>> {
    const storedElement: T | null = await this.elementModel
      .findById(id)
      .exec()
      .then((result) => (result ? new this.type(result.toObject()) : null));
    return Optional.ofNullable(storedElement);
  }

  save(element: T): T {
    return element;
  }
}
