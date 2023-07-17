import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { MongooseBookRepository } from './book.repository';
import { BookController } from './book.controller';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27016/book-repository'),
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
