import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AudioBook, Book, PaperBook } from './book';
import { MongooseBookRepository } from './book.repository';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Book.name,
        schema: BookSchema,
        discriminators: [
          { name: PaperBook.name, schema: PaperBookSchema },
          { name: AudioBook.name, schema: AudioBookSchema },
        ],
      },
    ]),
  ],
  providers: [
    {
      provide: 'BOOK_REPOSITORY',
      useClass: MongooseBookRepository,
    },
    BookService,
  ],
  controllers: [BookController],
})
export class BookModule {}
