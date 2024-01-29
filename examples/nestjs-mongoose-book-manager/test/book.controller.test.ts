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
  rootMongooseTestModule,
  setupConnection,
} from './util/mongo-server';

const timeout = 30000;

describe('Given the book manager controller', () => {
  let bookManager: INestApplication;
  let storedPaperBook: PaperBook;

  beforeAll(async () => {
    const appModule = await Test.createTestingModule({
      imports: [rootMongooseTestModule(), AppModule],
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
          .patch('/books')
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
          .patch('/books')
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

  describe('when deleting a book', () => {
    describe('that is not stored', () => {
      it('then returns false', () => {
        return request(bookManager.getHttpServer())
          .delete('/books/000000000000000000000000')
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.text).toBe('false');
          });
      });
    });

    describe('that is stored', () => {
      it('then returns true', () => {
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
