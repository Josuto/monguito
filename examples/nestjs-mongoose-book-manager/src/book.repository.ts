import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  AtomicRepository,
  IllegalArgumentException,
  MongooseAtomicRepository,
} from 'monguito';
import { AudioBook, Book, PaperBook } from './book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schemas';

@Injectable()
export class MongooseBookRepository
  extends MongooseAtomicRepository<Book>
  implements AtomicRepository<Book>
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

  async deleteById(id: string): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    return this.entityModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec()
      .then((book) => !!book);
  }
}
