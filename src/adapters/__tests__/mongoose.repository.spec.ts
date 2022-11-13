import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import {
  closeMongoConnection,
  deleteAllBooks,
  findBookById,
  insert,
  rootMongooseTestModule,
} from './util/mongo-server';
import { Optional } from 'typescript-optional';
import { Book } from './util/book';
import {
  BookRepository,
  BookSchema,
  MongooseBookRepository,
} from './util/book.repository';
import { NotFoundException, UniquenessViolationException } from '../exceptions';

describe('Given a repository instance', () => {
  let repository: BookRepository;
  let storedBook: Book;
  let storedBookId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
      ],
      providers: [MongooseBookRepository],
    }).compile();

    repository = module.get<BookRepository>(MongooseBookRepository);
  });

  beforeEach(async () => {
    const bookToStore = new Book({
      title: 'The Lord of the Rings',
      description: 'Best fantasy book ever',
      isbn: '978-0544003415',
    });
    storedBookId = await insert(bookToStore);
    storedBook = new Book({
      ...bookToStore,
      id: storedBookId,
    });
  });

  describe('when finding a book', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.findById(undefined as unknown as string),
        ).rejects.toThrowError('The given ID must be valid');
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.findById(null as unknown as string),
        ).rejects.toThrowError('The given ID must be valid');
      });
    });

    describe('by the ID of a nonexistent book', () => {
      it('then retrieves an empty book', async () => {
        const book = await repository.findById('000000000000000000000001');
        expect(book).toEqual(Optional.empty());
      });
    });

    describe('by the ID of an existent book', () => {
      it('then retrieves the book', async () => {
        const book = await repository.findById(storedBookId);
        expect(book.get()).toEqual(storedBook);
      });
    });
  });

  describe('when finding all the books', () => {
    it('then retrieves all the existent books', async () => {
      const books = await repository.findAll();
      expect(books.length).toBe(1);
      expect(books).toContainEqual(storedBook);
    });
  });

  describe('when saving an book', () => {
    describe('that is undefined', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.save(undefined as unknown as Book),
        ).rejects.toThrowError('The given element must be valid');
      });
    });

    describe('that is null', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.save(null as unknown as Book),
        ).rejects.toThrowError('The given element must be valid');
      });
    });

    describe('that specifies an ID not matching any stored book', () => {
      it('then throws an exception', async () => {
        const bookToUpdate = new Book({
          id: '00007032a61c4eda79230000',
          title: 'From the Earth to the Moon',
          description: 'Best early sci-fy book',
          isbn: '978-1521833698',
        });

        await expect(repository.save(bookToUpdate)).rejects.toThrowError(
          NotFoundException,
        );
      });
    });

    describe('that specifies an ISBN of a stored book', () => {
      it('then throws a duplicated key exception', async () => {
        const bookToInsert = new Book({
          title: 'Dragon Ball, Vol. 1',
          description: 'First Dragon Ball comic number',
          isbn: '978-0544003415',
        });

        await expect(repository.save(bookToInsert)).rejects.toThrowError(
          UniquenessViolationException,
        );
      });
    });

    describe('that has not previously been stored', () => {
      it('then inserts the book', async () => {
        const bookToInsert = new Book({
          title: 'Sapiens: A Brief History of Humankind',
          description: 'Great book about the origins of humankind',
          isbn: '978-0062316097',
        });

        const book = await repository.save(bookToInsert);
        expect(book.id).toBeTruthy();
        expect(book.title).toBe(bookToInsert.title);
        expect(book.description).toBe(bookToInsert.description);
      });
    });

    describe('that has previously been stored', () => {
      it('then updates the book', async () => {
        const bookToUpdate = new Book({
          id: storedBook.id,
          title: 'The Lord of the Rings Illustrated',
          description: 'Illustrated version',
          isbn: '978-0358653035',
        });

        const book = await repository.save(bookToUpdate);
        expect(book.id).toBe(bookToUpdate.id);
        expect(book.title).toBe(bookToUpdate.title);
        expect(book.description).toBe(bookToUpdate.description);
      });
    });
  });

  describe('when deleting an book', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError('The given ID must be valid');
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError('The given ID must be valid');
      });
    });

    describe('by the ID of a nonexistent book', () => {
      it('then returns false', async () => {
        const isDeleted = await repository.deleteById(
          '00007032a61c4eda79230000',
        );
        expect(isDeleted).toBe(false);
      });
    });

    describe('by the ID of an existent book', () => {
      it('then returns true and the book has been effectively deleted', async () => {
        const isDeleted = await repository.deleteById(storedBookId);
        expect(isDeleted).toBe(true);
        expect(await findBookById(storedBookId)).toBe(null);
      });
    });
  });

  afterEach(async () => {
    await deleteAllBooks();
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
