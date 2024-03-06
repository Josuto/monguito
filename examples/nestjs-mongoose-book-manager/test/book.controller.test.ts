import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AudioBook, PaperBook } from '../src/book';
import {
  closeMongoConnection,
  deleteAll,
  insert,
  rootMongooseStandaloneMongoTestModule,
  setupConnection,
} from './util/mongo-server';

const timeout = 30000;

describe('Given the book manager controller', () => {
  let bookManager: INestApplication;
  let storedPaperBook: PaperBook;

  beforeAll(async () => {
    const appModule = await Test.createTestingModule({
      imports: [rootMongooseStandaloneMongoTestModule(), AppModule],
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

  describe('when finding all books', () => {
    it('retrieves all the existent books', () => {
      return request(bookManager.getHttpServer())
        .get('/books')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toMatchObject([storedPaperBook]);
        });
    });
  });

  describe('when creating a new book', () => {
    describe('that is invalid', () => {
      it('returns a bad request HTTP status code', () => {
        return request(bookManager.getHttpServer())
          .post('/books')
          .send()
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is specifies an ID', () => {
      it('returns a bad request HTTP status code', () => {
        const audioBookToStore = {
          id: '000000000000000000000000',
          title: 'The Sandman',
          description: 'Fantastic fantasy audio book',
          hostingPlatforms: ['Audible'],
        } as AudioBook;
        return request(bookManager.getHttpServer())
          .post('/books')
          .send(audioBookToStore)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is valid', () => {
      it('returns the created book', () => {
        const audioBookToStore = {
          title: 'The Sandman',
          description: 'Fantastic fantasy audio book',
          hostingPlatforms: ['Audible'],
        } as AudioBook;
        return request(bookManager.getHttpServer())
          .post('/books')
          .send(audioBookToStore)
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            const storedAudioBook = response.body as AudioBook;
            expect(storedAudioBook.id).toBeTruthy();
            expect(storedAudioBook).toMatchObject(audioBookToStore);
          });
      });
    });
  });

  describe('when deleting a book', () => {
    describe('that is not stored', () => {
      it('returns false', () => {
        return request(bookManager.getHttpServer())
          .delete('/books/000000000000000000000000')
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.text).toBe('false');
          });
      });
    });

    describe('that is stored', () => {
      it('returns true', () => {
        return request(bookManager.getHttpServer())
          .delete(`/books/${storedPaperBook.id}`)
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.text).toBe('true');
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
