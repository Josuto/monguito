import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Entity } from '../../src';

const dbName = 'test';
let mongoServer: MongoMemoryServer;

type EntityWithOptionalDiscriminatorKey = Entity & { __t?: string };

export const insert = async (
  entity: EntityWithOptionalDiscriminatorKey,
  collection: string,
  discriminatorKey?: string,
) => {
  await setupConnection();
  if (discriminatorKey) {
    entity['__t'] = discriminatorKey;
  }

  return mongoose.connection.db
    .collection(collection)
    .insertOne(entity)
    .then((result) => result.insertedId.toString());
};

export const findById = async (id: string, collection: string) => {
  await setupConnection();
  return await mongoose.connection.db
    .collection(collection)
    .findOne({ id: id });
};

export const deleteAll = async (collection: string) => {
  await setupConnection();
  await mongoose.connection.db.collection(collection).deleteMany({});
  return;
};

export const closeMongoConnection = async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
};

export const setupConnection = async () => {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: dbName,
      },
    });
    await mongoose.connect(mongoServer.getUri());
    await mongoose.connection.useDb(dbName);
  }
};
