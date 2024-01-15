import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Entity } from '../../src';

export enum MongoServerType {
  STANDALONE,
  REPLICA_SET,
}

const dbName = 'test';
let mongoServer: MongoMemoryServer | MongoMemoryReplSet;

type EntityWithOptionalDiscriminatorKey = Entity & { __t?: string };

export const insert = async (
  entity: EntityWithOptionalDiscriminatorKey,
  collection: string,
  discriminatorKey?: string,
) => {
  if (discriminatorKey) {
    entity['__t'] = discriminatorKey;
  }

  return mongoose.connection.db
    .collection(collection)
    .insertOne(entity)
    .then((result) => result.insertedId.toString());
};

export const findOne = async (filter: any, collection: string) => {
  return await mongoose.connection.db.collection(collection).findOne(filter);
};

export const findById = async (id: string, collection: string) => {
  return await mongoose.connection.db
    .collection(collection)
    .findOne({ id: id });
};

export const deleteAll = async (collection: string) => {
  await mongoose.connection.db.collection(collection).deleteMany({});
};

export const closeMongoConnection = async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
};

export const setupConnection = async (
  mongoServerType: MongoServerType = MongoServerType.STANDALONE,
) => {
  if (!mongoServer) {
    if (mongoServerType === MongoServerType.STANDALONE) {
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName },
      });
    } else {
      mongoServer = await MongoMemoryReplSet.create({
        replSet: { dbName, count: 1 },
      });
    }
    await mongoose.connect(mongoServer.getUri(), { dbName });
  }
};
