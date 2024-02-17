import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Repository } from '../../../dist';
import { AppModule } from '../src/app.module';
import { AudioBook, Book, PaperBook } from '../src/book';
import { MongooseBookRepository } from '../src/book.repository';
import {
  closeMongoConnection,
  deleteAll,
  rootMongooseStandaloneMongoTestModule,
  setupConnection,
} from './util/mongo-server';

const timeout = 30000;

describe('Given the book manager controller', () => {
  let bookManager: INestApplication;
  let storedPaperBook: PaperBook;
  let bookRepository: Repository<Book>;

  beforeAll(async () => {
    const appModule = await Test.createTestingModule({
      imports: [rootMongooseStandaloneMongoTestModule(), AppModule],
    }).compile();

    const connection = await setupConnection();

    bookManager = appModule.createNestApplication();
    await bookManager.init();

    bookRepository = new MongooseBookRepository(connection!);
  }, timeout);

  beforeEach(async () => {
    const paperBookToStore = new PaperBook({
      title: 'Effective Java',
      description: 'Great book on the Java programming language',
      edition: 3,
    });
    storedPaperBook = await bookRepository.save(paperBookToStore, undefined, {
      userId: '1234',
    });
  });

  describe('when finding all books', () => {
    it('retrieves all the existent books', () => {
      return request(bookManager.getHttpServer())
        .get('/books')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(new PaperBook(res.body[0])).toMatchObject(storedPaperBook);
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
