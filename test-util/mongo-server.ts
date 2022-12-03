import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Book } from './book';

let mongoServer: MongoMemoryServer;
const dbName = 'test';
const collection = 'books';

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

export const insert = async (book: Book) => {
  await setupConnection();
  return mongoose.connection.db
    .collection(collection)
    .insertOne(book)
    .then((result) => result.insertedId.toString());
};

export const findBookById = async (id: string) => {
  await setupConnection();
  return await mongoose.connection.db
    .collection(collection)
    .findOne({ _id: id });
};

export const deleteAllBooks = async () => {
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
