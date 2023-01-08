import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Book } from './book';
import {
  AudioBookSchema,
  BookSchema,
  PaperBookSchema,
} from './book.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Book.name,
        schema: BookSchema,
        discriminators: [
          { name: 'Paper', schema: PaperBookSchema },
          { name: 'Audio', schema: AudioBookSchema },
        ],
      },
    ]),
  ],
  providers: [BookService],
  controllers: [BookController],
})
export class BookModule {}
