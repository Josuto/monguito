import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  InjectModel,
  MongooseModule,
  MongooseModuleOptions,
} from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Repository } from './repository';
import { MongoRepository } from './mongo.repository';
import { BaseSchema, extendSchema } from './mongoose.base-schema';

export class Element {
  readonly id?: string;
  readonly name: string;
  readonly description: string;

  constructor(element: { id?: string; name: string; description: string }) {
    this.id = element.id;
    this.name = element.name;
    this.description = element.description;
  }
}

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

let mongod: MongoMemoryServer;
const dbName = 'test';

export const rootMongooseTestModule = (options: MongooseModuleOptions = {}) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: dbName,
        },
      });
      const mongoUri = mongod.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });

export const insertElement = async (element: Element) => {
  await mongoose.connect(mongod.getUri());
  await mongoose.connection.useDb(dbName);
  return mongoose.connection.db
    .collection('elements')
    .insertOne(element)
    .then((result) => result.insertedId.toString());
};

export const deleteAllElements = async () => {
  if (!mongod) return;
  await mongoose.connect(mongod.getUri());
  await mongoose.connection.useDb(dbName);
  await mongoose.connection.db.collection('elements').deleteMany({});
  return;
};

export const closeInMongodConnection = async () => {
  await mongoose.disconnect();
  await mongod?.stop();
};
