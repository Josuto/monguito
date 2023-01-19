import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Entity } from '../src/entity';

let mongoServer: MongoMemoryServer;
const dbName = 'test';
mongoose.set('strictQuery', false);

export const rootMongooseTestModule = (options: MongooseModuleOptions = {}) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: dbName,
        },
      });
      const mongoUri = mongoServer.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });

export const insert = async (entity: Entity, collection: string) => {
  await setupConnection();
  return mongoose.connection.db
    .collection(collection)
    .insertOne(entity)
    .then((result) => result.insertedId.toString());
};

export const findById = async (id: string, collection: string) => {
  await setupConnection();
  return await mongoose.connection.db
    .collection(collection)
    .findOne({ _id: id });
};

export const deleteAll = async (collection: string) => {
  if (!mongoServer) return;
  await setupConnection();
  await mongoose.connection.db.collection(collection).deleteMany({});
  return;
};

export const closeMongoConnection = async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
};

const setupConnection = async () => {
  await mongoose.connect(mongoServer.getUri());
  await mongoose.connection.useDb(dbName);
};
