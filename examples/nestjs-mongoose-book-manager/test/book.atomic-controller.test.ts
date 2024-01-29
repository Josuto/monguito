import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AudioBook, PaperBook } from '../src/book';
import {
  closeMongoConnection,
  deleteAll,
  findOne,
  insert,
  rootMongooseReplicaSetMongoTestModule,
  setupConnection,
} from './util/mongo-server';

const timeout = 30000;

describe('Given the book manager controller', () => {
  let bookManager: INestApplication;
  let storedPaperBook: PaperBook;

  beforeAll(async () => {
    const appModule = await Test.createTestingModule({
      imports: [rootMongooseReplicaSetMongoTestModule(), AppModule],
    }).compile();

    await setupConnection();

    bookManager = appModule.createNestApplication();
    await bookManager.init();
  }, timeout);

  beforeEach(async () => {
    const paperBookToStore = new PaperBook({
      title: 'Effective Java',
      description: 'Great book on the Java programming language',
      edition: 3,
    });
    const storedPaperBookId = await insert(
      paperBookToStore,
      'books',
      PaperBook.name,
    );
    storedPaperBook = new PaperBook({
      ...paperBookToStore,
      id: storedPaperBookId,
    });
  });

  describe('when saving a list of books', () => {
    describe('that includes an invalid book', () => {
      it('then returns a bad request HTTP status code', () => {
        const booksToStore = [
          {
            title: 'The Sandman',
            description: 'Fantastic fantasy audio book',
            hostingPlatforms: ['Audible'],
          } as AudioBook,
          {
            description: 'Invalid paper book description',
            edition: 1,
          } as PaperBook,
        ];
        return request(bookManager.getHttpServer())
          .post('/books/all')
          .send(booksToStore)
          .then(async (result) => {
            expect(result.status).toEqual(HttpStatus.BAD_REQUEST);
            expect(await findOne({ title: 'The Sandman' }, 'books')).toBeNull();
          });
      });
    });
  });

  afterEach(async () => {
    await deleteAll(['books']);
  });

  afterAll(async () => {
    await bookManager.close();
    await closeMongoConnection();
  }, timeout);
});
