import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookController } from './book.controller';
import { MongooseBookRepository } from './book.repository';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27016/book-repository', {
      directConnection: true,
      replicaSet: 'rs0',
    }),
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
