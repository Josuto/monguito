import { MongooseRepository, Repository } from 'node-abstract-repository';
import { AudioBook, Book, PaperBook } from './book';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements Repository<Book>
{
  constructor(
    @InjectModel(Book.name)
    private readonly bookModel: Model<Book>,
  ) {
    super(bookModel, {
      Default: Book,
      PaperBook: PaperBook,
      AudioBook: AudioBook,
    });
  }
}
