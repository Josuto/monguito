import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { BookModule } from './book/book.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27016/book-repository'),
    BookModule,
  ],
})
export class AppModule {}
