import { Module } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { BookController } from './book.controller';
import { MongooseBookRepository } from './book.repository';

// TS 6.0.3 mis-resolves mongodb's ConnectOptions as requiring its TLS/socket
// properties (TS 5.7.2 compiles the identical types without issue); cast
// until upstream fixes it.
const mongooseModuleOptions = {
  directConnection: true,
  replicaSet: 'rs0',
} as MongooseModuleOptions;

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://localhost:27016/book-repository',
      mongooseModuleOptions,
    ),
  ],
  providers: [
    {
      provide: 'BOOK_REPOSITORY',
      useClass: MongooseBookRepository,
    },
  ],
  controllers: [BookController],
})
export class AppModule {}
