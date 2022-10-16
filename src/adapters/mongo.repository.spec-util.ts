import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Element } from '../domain/element';

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

export const findElementById = async (id: string) => {
  await mongoose.connect(mongod.getUri());
  await mongoose.connection.useDb(dbName);
  return await mongoose.connection.db
    .collection('elements')
    .findOne({ _id: id });
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
