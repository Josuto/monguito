import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Entity } from '../../../../src';

const dbName = 'test';
let mongoServer: MongoMemoryServer | MongoMemoryReplSet;

export const rootMongooseStandaloneMongoTestModule = (
  options: MongooseModuleOptions = {},
) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName, port: 27016 },
      });
      const mongoUri = mongoServer.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });

export const rootMongooseReplicaSetMongoTestModule = (
  options: MongooseModuleOptions = {},
) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryReplSet.create({
        instanceOpts: [{ port: 27016 }],
        replSet: { name: 'rs0', dbName, count: 1 },
      });
      const mongoUri = mongoServer.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });

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

export const deleteAll = async (collections: string[]) => {
  await Promise.all(
    collections.map((c) => mongoose.connection.db.collection(c).deleteMany({})),
  );
  return;
};

export const setupConnection = async () => {
  if (!mongoServer) return;
  await mongoose.connect(mongoServer.getUri(), { dbName });
};

export const closeMongoConnection = async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
};
