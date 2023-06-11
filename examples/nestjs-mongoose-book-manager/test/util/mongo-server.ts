import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Entity } from '../../../../src';

let mongoServer: MongoMemoryServer;
let dbName: string;

export const rootMongooseTestModule = (
  options: MongooseModuleOptions = {},
  port = 27016,
  dbName = 'book-repository',
) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          port,
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

export const deleteAll = async (collections: string[]) => {
  await setupConnection();
  await Promise.all(
    collections.map((c) => mongoose.connection.db.collection(c).deleteMany({})),
  );
  return;
};

const setupConnection = async () => {
  if (!mongoServer) return;
  await mongoose.connect(mongoServer.getUri());
  await mongoose.connection.useDb(dbName);
};

export const closeMongoConnection = async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
};
