import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AudioBook, PaperBook } from '../src/book';
import {
  closeMongoConnection,
  deleteAll,
  findAll,
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

  describe('when updating a book', () => {
    describe('that is invalid', () => {
      it('returns a bad request HTTP status code', () => {
        const paperBookToUpdate = {
          edition: 0,
        };
        return request(bookManager.getHttpServer())
          .patch(`/books/${storedPaperBook.id}`)
          .send(paperBookToUpdate)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is not stored', () => {
      it('returns a bad request HTTP status code', () => {
        const paperBookToUpdate = {
          edition: 4,
        };
        return request(bookManager.getHttpServer())
          .patch('/books/000000000000000000000000')
          .send(paperBookToUpdate)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is stored', () => {
      it('returns the updated book', () => {
        const paperBookToUpdate = {
          edition: 4,
        };
        return request(bookManager.getHttpServer())
          .patch(`/books/${storedPaperBook.id}`)
          .send(paperBookToUpdate)
          .expect(HttpStatus.OK)
          .expect((response) => {
            const updatedPaperBook = response.body as PaperBook;
            expect(updatedPaperBook).toMatchObject(paperBookToUpdate);
            expect(updatedPaperBook.title).toBe(storedPaperBook.title);
            expect(updatedPaperBook.description).toBe(
              storedPaperBook.description,
            );
          });
      });
    });
  });

  describe('when saving a list of books', () => {
    beforeEach(async () => {
      const paperBookToStore = new PaperBook({
        title: 'Effective Java',
        description: 'Great book on the Java programming language',
        edition: 2,
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

    describe('that includes an invalid book', () => {
      it('returns a bad request HTTP status code', async () => {
        const booksToStore = [
          {
            id: storedPaperBook.id,
            edition: 3,
          } as Partial<PaperBook>,
          {
            description: 'Paper book to insert with no title (thus, invalid)',
            edition: 3,
          } as PaperBook,
        ];
        return request(bookManager.getHttpServer())
          .post('/books/all')
          .send(booksToStore)
          .then(async (result) => {
            expect(result.status).toEqual(HttpStatus.BAD_REQUEST);
            expect(await findOne('books', { title: 'Accelerate' })).toBeNull();
            const updatedPaperBook = await findOne('books', {
              title: 'Effective Java',
            });
            expect(updatedPaperBook).toBeDefined();
            expect(updatedPaperBook!.edition).toBe(2);
          });
      });
    });

    describe('that includes valid books', () => {
      it('returns the created books', async () => {
        const booksToStore = [
          {
            title: 'Accelerate',
            description: 'Building High Performing Technology Organizations',
            hostingPlatforms: ['Audible'],
          } as AudioBook,
          {
            id: storedPaperBook.id,
            edition: 3,
          } as Partial<PaperBook>,
        ];
        return request(bookManager.getHttpServer())
          .post('/books/all')
          .send(booksToStore)
          .then(async (result) => {
            expect(result.status).toEqual(HttpStatus.CREATED);
            expect(
              await findOne('books', { title: 'Accelerate' }),
            ).toBeDefined();
            const updatedPaperBook = await findOne('books', {
              title: 'Effective Java',
            });
            expect(updatedPaperBook).toBeDefined();
            expect(updatedPaperBook!.edition).toBe(3);
          });
      });
    });
  });

  describe('when deleting all books', () => {
    beforeEach(async () => {
      const paperBookToStore = new PaperBook({
        title: 'Effective Java',
        description: 'Great book on the Java programming language',
        edition: 2,
      });
      const audioBookToStore = new AudioBook({
        title: 'The Sandman',
        description: 'Fantastic fantasy audio book',
        hostingPlatforms: ['Audible'],
      });
      await insert(paperBookToStore, 'books', PaperBook.name);
      await insert(audioBookToStore, 'books', AudioBook.name);
    });

    it('deletes all books', async () => {
      return request(bookManager.getHttpServer())
        .delete('/books')
        .then(async (result) => {
          expect(result.status).toEqual(HttpStatus.OK);
          expect(result.text).toBe('2');

          const storedBooks = await findAll('books');
          storedBooks.forEach((book) => {
            expect(book.isDeleted).toBe(true);
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
