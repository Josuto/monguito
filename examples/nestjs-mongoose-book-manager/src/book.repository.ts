import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  IllegalArgumentException,
  MongooseTransactionalRepository,
  TransactionalRepository,
} from 'monguito';
import { AudioBook, Book, PaperBook } from './book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schemas';

@Injectable()
export class MongooseBookRepository
  extends MongooseTransactionalRepository<Book>
  implements TransactionalRepository<Book>
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
