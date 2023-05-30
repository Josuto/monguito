import { MongooseRepository, Repository } from 'node-abstract-repository';
import { AudioBook, Book, PaperBook } from './book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schemas';
import { Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements Repository<Book>
{
  constructor(@InjectConnection() connection: Connection) {
    super(
      {
        Default: { type: Book, schema: BookSchema },
        PaperBook: { type: PaperBook, schema: PaperBookSchema },
        AudioBook: { type: AudioBook, schema: AudioBookSchema },
      },
      connection,
    );
  }
}
