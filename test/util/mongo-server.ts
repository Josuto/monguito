import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Entity } from '../../src';

const dbName = 'test';
let mongoServer: MongoMemoryServer;
mongoose.set('strictQuery', false);

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
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: dbName,
      },
    });
  }
  await mongoose.connect(mongoServer.getUri());
  await mongoose.connection.useDb(dbName);
};
