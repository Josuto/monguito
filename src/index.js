import { Repository } from './repository/repository.js';
import { MongooseRepository } from './repository/mongoose.repository.js';
import { BaseSchema, extendSchema } from './repository/mongoose.base-schema.js';
import { Entity, PolymorphicEntity } from './repository/util/entity.js';
import {
  IllegalArgumentException,
  NotFoundException,
  UndefinedConstructorException,
  UniquenessViolationException,
} from './repository/util/exceptions.js';

export {
  Repository,
  MongooseRepository,
  BaseSchema,
  extendSchema,
  Entity,
  PolymorphicEntity,
  IllegalArgumentException,
  UndefinedConstructorException,
  UniquenessViolationException,
  NotFoundException,
};
