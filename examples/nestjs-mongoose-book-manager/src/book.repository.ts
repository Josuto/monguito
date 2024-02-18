import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import {
  DeleteAllOptions,
  DeleteByIdOptions,
  IllegalArgumentException,
  MongooseTransactionalRepository,
  TransactionalRepository,
  runInTransaction,
} from 'monguito';
import { AuditOptions } from '../../../dist/util/operation-options';
import { AudioBook, Book, PaperBook } from './book';
import { AudioBookSchema, BookSchema, PaperBookSchema } from './book.schemas';

type SoftDeleteAllOptions = DeleteAllOptions & AuditOptions;
type SoftDeleteByIdOptions = DeleteByIdOptions & AuditOptions;

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

  async deleteById(
    id: string,
    options?: SoftDeleteByIdOptions,
  ): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    return this.entityModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .session(options?.session)
      .exec()
      .then((book) => !!book);
  }

  async deleteAll(options?: SoftDeleteAllOptions): Promise<number> {
    if (options?.filters === null) {
      throw new IllegalArgumentException('The given filters must be valid');
    }
    return await runInTransaction(
      async (session: ClientSession) => {
        const books = await this.findAll({
          filters: options?.filters,
          session,
        });
        const booksToDelete = books.map((book) => {
          book.isDeleted = true;
          return book;
        });
        const deletedBooks = await this.saveAll(booksToDelete, { session });
        return deletedBooks.length;
      },
      { ...options, connection: this.connection },
    );
  }
}
