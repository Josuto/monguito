import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeMongoConnection,
  deleteAll,
  insert,
  rootMongooseTestModule,
} from './util/mongo-server';
import { AudioBook, PaperBook } from '../src/book/book';

describe('Given the book manager controller', () => {
  let bookManager: INestApplication;
  let storedPaperBook: PaperBook;

  beforeAll(async () => {
    const appModule = await Test.createTestingModule({
      imports: [rootMongooseTestModule(), AppModule],
    }).compile();

    bookManager = appModule.createNestApplication();
    await bookManager.init();
  });

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
    it('then retrieves all the existent books', () => {
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
      it('then returns a bad request HTTP status code', () => {
        return request(bookManager.getHttpServer())
          .post('/books')
          .send()
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is specifies an ID', () => {
      it('then returns a bad request HTTP status code', () => {
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
      it('then returns the created book', () => {
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

  describe('when updating a book', () => {
    describe('that is invalid', () => {
      it('then returns a bad request HTTP status code', () => {
        return request(bookManager.getHttpServer())
          .patch('/books/')
          .send()
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is not stored', () => {
      it('then returns a bad request HTTP status code', () => {
        const paperBookToUpdate = {
          id: '000000000000000000000000',
          edition: 4,
        };
        return request(bookManager.getHttpServer())
          .patch('/books/')
          .send(paperBookToUpdate)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('that is stored', () => {
      it('then returns the created book', () => {
        const paperBookToUpdate = {
          id: storedPaperBook.id,
          edition: 4,
        };
        return request(bookManager.getHttpServer())
          .patch('/books')
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

  afterEach(async () => {
    await deleteAll(['books']);
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
