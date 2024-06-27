import { Optional } from 'typescript-optional';
import {
  IllegalArgumentException,
  ValidationException,
} from '../../src/util/exceptions';
import { AudioBook, Book, PaperBook } from '../domain/book';
import {
  audioBookFixture,
  bookFixture,
  electronicBookFixture,
  paperBookFixture,
} from '../domain/book.fixtures';
import {
  MongoServerType,
  closeMongoConnection,
  deleteAll,
  findById,
  insert,
  setupConnection,
} from '../util/mongo-server';
import { BookRepository, MongooseBookRepository } from './book.repository';

describe('Given an instance of book repository', () => {
  let bookRepository: BookRepository;
  let storedBook: Book;
  let storedPaperBook: PaperBook;
  let storedAudioBook: AudioBook;

  beforeAll(async () => {
    await setupConnection(MongoServerType.STANDALONE);
    bookRepository = new MongooseBookRepository();
  });

  describe('when searching a book by ID', () => {
    describe('by an undefined ID', () => {
      it('throws an exception', async () => {
        await expect(
          bookRepository.findById(undefined as unknown as string),
        ).rejects.toThrow(IllegalArgumentException);
      });
    });

    describe('by a null ID', () => {
      it('throws an exception', async () => {
        await expect(
          bookRepository.findById(null as unknown as string),
        ).rejects.toThrow(IllegalArgumentException);
      });
    });

    describe('by the ID of a nonexistent book', () => {
      it('retrieves an empty book', async () => {
        const book = await bookRepository.findById('000000000000000000000001');
        expect(book).toEqual(Optional.empty());
      });
    });

    describe('by the ID of an existent book', () => {
      beforeEach(async () => {
        const paperBookToStore = paperBookFixture();
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

      afterEach(async () => {
        await deleteAll('books');
      });

      it('retrieves the book', async () => {
        const book = await bookRepository.findById(storedPaperBook.id!);
        expect(book.isPresent()).toBe(true);
        expect(book.get()).toEqual(storedPaperBook);
      });
    });
  });

  describe('when searching one book', () => {
    describe('and there is no book stored', () => {
      describe('not using any filter', () => {
        it('retrieves an empty book', async () => {
          const book = await bookRepository.findOne();
          expect(book).toEqual(Optional.empty());
        });
      });
    });

    describe('and there are books stored', () => {
      beforeEach(async () => {
        const paperBookToStore = paperBookFixture();
        const audioBookToStore = audioBookFixture();

        const storedPaperBookId = await insert(
          paperBookToStore,
          'books',
          PaperBook.name,
        );
        storedPaperBook = new PaperBook({
          ...paperBookToStore,
          id: storedPaperBookId,
        });

        const storedAudioBookId = await insert(
          audioBookToStore,
          'books',
          AudioBook.name,
        );
        storedAudioBook = new AudioBook({
          ...audioBookToStore,
          id: storedAudioBookId,
        });
      });

      describe('not using any filter', () => {
        it('returns an arbitrary book', async () => {
          const book = await bookRepository.findOne();
          expect(book.isPresent()).toBe(true);
          expect([storedPaperBook, storedAudioBook]).toContainEqual(book.get());
        });
      });

      describe('using an undefined filter', () => {
        it('returns an arbitrary book', async () => {
          const book = await bookRepository.findOne({ filters: undefined });
          expect(book.isPresent()).toBe(true);
          expect([storedPaperBook, storedAudioBook]).toContainEqual(book.get());
        });
      });

      describe('using a null filter', () => {
        it('returns an arbitrary book', async () => {
          const book = await bookRepository.findOne({
            filters: null as unknown as object,
          });
          expect(book.isPresent()).toBe(true);
          expect([storedPaperBook, storedAudioBook]).toContainEqual(book.get());
        });
      });

      describe('using a filter matching no book', () => {
        it('retrieves an empty book', async () => {
          const book = await bookRepository.findOne({
            filters: { title: 'The Hobbit' },
          });
          expect(book).toEqual(Optional.empty());
        });
      });

      describe('using a filter matching one book', () => {
        it('retrieves the book', async () => {
          const book = await bookRepository.findOne({
            filters: { title: storedPaperBook.title },
          });
          expect(book.isPresent()).toBe(true);
          expect(book.get()).toEqual(storedPaperBook);
        });
      });

      describe('using a filter matching several books', () => {
        it('retrieves the first book inserted', async () => {
          const book = await bookRepository.findOne({
            filters: { title: { $exists: true } },
          });
          expect(book.isPresent()).toBe(true);
          expect(book.get()).toEqual(storedPaperBook);
        });
      });

      afterEach(async () => {
        await deleteAll('books');
      });
    });
  });

  describe('when searching a book by a custom field value', () => {
    describe('and the search value is undefined', () => {
      it('throws an error', async () => {
        await expect(
          bookRepository.findByIsbn(undefined as unknown as string),
        ).rejects.toThrow();
      });
    });

    describe('and the search value is null', () => {
      it('throws an error', async () => {
        await expect(
          bookRepository.findByIsbn(null as unknown as string),
        ).rejects.toThrow();
      });
    });

    describe('and there is no book matching the given search value', () => {
      it('returns an empty book', async () => {
        const book = await bookRepository.findByIsbn('0000000000');
        expect(book).toEqual(Optional.empty());
      });
    });

    describe('and there is one book matching the given search value', () => {
      beforeEach(async () => {
        const bookToStore = bookFixture();
        const storedBookId = await insert(bookToStore, 'books');
        storedBook = new Book({
          ...bookToStore,
          id: storedBookId,
        });
      });

      afterEach(async () => {
        await deleteAll('books');
      });

      it('returns a book matching the given search value', async () => {
        const book = await bookRepository.findByIsbn(storedBook.isbn);
        expect(book.isPresent()).toBe(true);
        expect(book.get()).toEqual(storedBook);
      });
    });
  });

  describe('when searching books', () => {
    beforeEach(async () => {
      const bookToStore = bookFixture();
      const storedBookId = await insert(bookToStore, 'books');
      storedBook = new Book({
        ...bookToStore,
        id: storedBookId,
      });

      const paperBookToStore = paperBookFixture();
      const storedPaperBookId = await insert(
        paperBookToStore,
        'books',
        PaperBook.name,
      );
      storedPaperBook = new PaperBook({
        ...paperBookToStore,
        id: storedPaperBookId,
      });

      const audioBookToStore = audioBookFixture();
      const storedAudioBookId = await insert(
        audioBookToStore,
        'books',
        AudioBook.name,
      );
      storedAudioBook = new AudioBook({
        ...audioBookToStore,
        id: storedAudioBookId,
      });
    });

    afterEach(async () => {
      await deleteAll('books');
    });

    describe('and not providing any optional parameter', () => {
      it('retrieves a list with all books', async () => {
        const books = await bookRepository.findAll();
        expect(books.length).toBe(3);
        expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
      });
    });

    describe('and providing a value for the filter parameter', () => {
      describe('and the filters is null', () => {
        it('retrieves a list with all books', async () => {
          const books = await bookRepository.findAll({
            filters: null as unknown as object,
          });
          expect(books.length).toBe(3);
        });
      });

      describe('and the filters do not refer to an existing field in any Book type', () => {
        it('retrieves an empty list of books', async () => {
          const filters = { fruit: 'Banana' };
          const books = await bookRepository.findAll({ filters });
          expect(books.length).toBe(0);
        });
      });

      describe('and such a value refers to an existing field in some Book type', () => {
        it('retrieves a list with all books matching the filter', async () => {
          const filters = { title: 'Effective Java' };
          const books = await bookRepository.findAll({ filters });
          expect(books.length).toBe(1);
          expect(books).toEqual([storedPaperBook]);
        });
      });
    });

    describe('and providing a value for the sort parameter', () => {
      describe('and such a value is the name of a book property', () => {
        it('retrieves an ordered list with books', async () => {
          const books = await bookRepository.findAll({
            sortBy: 'title',
          });
          expect(books.length).toBe(3);
          expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
        });
      });

      describe('and such a value is ascendent on a book property', () => {
        it('retrieves an ordered list with books', async () => {
          const books = await bookRepository.findAll({
            sortBy: { title: 'asc' },
          });
          expect(books.length).toBe(3);
          expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
        });
      });

      describe('and such a value is descendent on a book property', () => {
        it('retrieves an ordered list with books', async () => {
          const books = await bookRepository.findAll({ sortBy: { title: -1 } });
          expect(books.length).toBe(3);
          expect(books).toEqual([storedAudioBook, storedPaperBook, storedBook]);
        });
      });
    });

    describe('and providing a value for the pagination parameter', () => {
      describe('and the page number is undefined', () => {
        describe('and the offset is undefined', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: undefined as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is null', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: null as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: -1,
            };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: 0,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is one', () => {
          it('retrieves a list one book', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: 1,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: 3,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: 4,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });
      });

      describe('and the page number is null', () => {
        describe('and the offset is undefined', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: undefined as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is null', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: null as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: -1,
            };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: 0,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is one', () => {
          it('retrieves a list one book', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: 1,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: 3,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: 4,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });
      });

      describe('and the page number is a negative number', () => {
        describe('and the offset is undefined', () => {
          it('throws an exception', async () => {
            const pageable = {
              pageNumber: -1,
              offset: undefined as unknown as number,
            };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is null', () => {
          it('throws an exception', async () => {
            const pageable = {
              pageNumber: -1,
              offset: null as unknown as number,
            };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: -1 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 0 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is one', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 1 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 3 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 4 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });
      });

      describe('and the page number is zero', () => {
        describe('and the offset is undefined', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: 0,
              offset: undefined as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is null', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: 0,
              offset: null as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: 0, offset: -1 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('retrieves a list with all books', async () => {
            const pageable = { pageNumber: 0, offset: 0 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is one', () => {
          it('retrieves a list one book', async () => {
            const pageable = { pageNumber: 0, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = { pageNumber: 0, offset: 3 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = { pageNumber: 0, offset: 4 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });
      });

      describe('and the page number is one', () => {
        describe('and the offset is undefined', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: 1,
              offset: undefined as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is null', () => {
          it('retrieves a list with all books', async () => {
            const pageable = {
              pageNumber: 1,
              offset: null as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: 1, offset: -1 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('retrieves a list with all books', async () => {
            const pageable = { pageNumber: 1, offset: 0 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is one', () => {
          it('retrieves a list with one book', async () => {
            const pageable = { pageNumber: 1, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = { pageNumber: 1, offset: 3 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('retrieves a list with all books', async () => {
            const pageable = { pageNumber: 1, offset: 4 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });
      });

      describe('and the page number is equals to the amount of all of the stored books', () => {
        describe('and the offset is undefined', () => {
          it('retrieves a list of all books', async () => {
            const pageable = {
              pageNumber: 3,
              offset: undefined as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is null', () => {
          it('retrieves a list of all books', async () => {
            const pageable = {
              pageNumber: 3,
              offset: null as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: 3, offset: -1 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('retrieves a list of all books', async () => {
            const pageable = { pageNumber: 3, offset: 0 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is one', () => {
          it('retrieves a list with one book', async () => {
            const pageable = { pageNumber: 3, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedAudioBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 3, offset: 3 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 3, offset: 4 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });
      });

      describe('and the page number is bigger than the amount of all of the stored books', () => {
        describe('and the offset is undefined', () => {
          it('retrieves a list of all books', async () => {
            const pageable = {
              pageNumber: 4,
              offset: undefined as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is null', () => {
          it('retrieves a list of all books', async () => {
            const pageable = {
              pageNumber: 4,
              offset: null as unknown as number,
            };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is a negative number', () => {
          it('throws an exception', async () => {
            const pageable = { pageNumber: 4, offset: -1 };
            await expect(bookRepository.findAll({ pageable })).rejects.toThrow(
              IllegalArgumentException,
            );
          });
        });

        describe('and the offset is zero', () => {
          it('retrieves a list of all books', async () => {
            const pageable = { pageNumber: 4, offset: 0 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(3);
            expect(books).toEqual([
              storedBook,
              storedPaperBook,
              storedAudioBook,
            ]);
          });
        });

        describe('and the offset is one', () => {
          it('retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 4, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 4, offset: 3 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 4, offset: 4 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });
      });
    });

    describe('and providing a valid value for all optional parameters', () => {
      it('retrieves an ordered list with books matching the filter', async () => {
        const filters = { __t: ['PaperBook', 'AudioBook'] };
        const pageable = { pageNumber: 1, offset: 1 };
        const books = await bookRepository.findAll({
          filters,
          sortBy: { title: -1 },
          pageable,
        });
        expect(books.length).toBe(1);
        expect(books).toEqual([storedAudioBook]);
      });
    });
  });

  describe('when saving a book', () => {
    describe('which type is not registered in the repository', () => {
      it('throws an exception', async () => {
        const bookToInsert = electronicBookFixture();
        await expect(bookRepository.save(bookToInsert)).rejects.toThrow(
          IllegalArgumentException,
        );
      });
    });

    describe('which type is registered in the repository', () => {
      describe('that is undefined', () => {
        it('throws an exception', async () => {
          await expect(
            bookRepository.save(undefined as unknown as Book),
          ).rejects.toThrow(IllegalArgumentException);
        });
      });

      describe('that is null', () => {
        it('throws an exception', async () => {
          await expect(
            bookRepository.save(null as unknown as Book),
          ).rejects.toThrow(IllegalArgumentException);
        });
      });

      describe('that is new', () => {
        describe('and that is of supertype Book', () => {
          describe('and specifies an ID', () => {
            it('throws an exception', async () => {
              const bookToInsert = bookFixture(
                {
                  title: 'Modern Software Engineering',
                  description: 'Build Better Software Faster',
                  isbn: '9780321601919',
                },
                '00007032a61c4eda79230000',
              );

              await expect(bookRepository.save(bookToInsert)).rejects.toThrow(
                IllegalArgumentException,
              );
            });
          });

          describe('and does not specify an ID', () => {
            describe('and some field values are invalid', () => {
              beforeEach(async () => {
                const bookToStore = bookFixture();
                const storedBookId = await insert(bookToStore, 'books');
                storedBook = new Book({
                  ...bookToStore,
                  id: storedBookId,
                });
              });

              afterEach(async () => {
                await deleteAll('books');
              });

              it('throws an exception', async () => {
                const bookToInsert = bookFixture({
                  title: undefined, // Missing title
                  description: 'Build Better Software Faster',
                  isbn: storedBook.isbn, // Duplicated ISBN
                });

                await expect(bookRepository.save(bookToInsert)).rejects.toThrow(
                  ValidationException,
                );
              });
            });

            describe('and all field values are valid', () => {
              it('inserts the book', async () => {
                const bookToInsert = bookFixture({
                  title: 'Modern Software Engineering',
                  description: 'Build Better Software Faster',
                  isbn: '9780321601919',
                });

                const book = await bookRepository.save(bookToInsert);
                expect(book.id).toBeTruthy();
                expect(book.title).toBe(bookToInsert.title);
                expect(book.description).toBe(bookToInsert.description);
              });
            });
          });
        });

        describe('and that is of a subtype of Book', () => {
          describe('and some field values are invalid', () => {
            it('throws an exception', async () => {
              const bookToInsert = paperBookFixture({
                title: 'Implementing Domain-Driven Design',
                description: 'Describes Domain-Driven Design in depth',
                isbn: undefined,
              });

              await expect(bookRepository.save(bookToInsert)).rejects.toThrow(
                ValidationException,
              );
            });
          });

          describe('and all field values are valid', () => {
            it('inserts the book', async () => {
              const bookToInsert = paperBookFixture({
                title: 'Implementing Domain-Driven Design',
                description: 'Describes Domain-Driven Design in depth',
                isbn: '0134685998',
              });

              const book = await bookRepository.save(bookToInsert);
              expect(book.id).toBeTruthy();
              expect(book.title).toBe(bookToInsert.title);
              expect(book.description).toBe(bookToInsert.description);
              expect(book.edition).toBe(bookToInsert.edition);
            });
          });
        });
      });

      describe('that is not new', () => {
        describe('and that is of supertype Book', () => {
          beforeEach(async () => {
            const bookToStore = bookFixture();
            const storedBookId = await insert(bookToStore, 'books');
            storedBook = new Book({
              ...bookToStore,
              id: storedBookId,
            });
          });

          afterEach(async () => {
            await deleteAll('books');
          });

          describe('and that specifies partial contents of the supertype', () => {
            describe('and some field values are invalid', () => {
              it('throws an exception', async () => {
                const bookToUpdate = {
                  id: storedBook.id,
                  description:
                    'A Novel About IT, DevOps, and Helping Your Business Win',
                  isbn: undefined as unknown as string,
                } as Book;

                await expect(bookRepository.save(bookToUpdate)).rejects.toThrow(
                  ValidationException,
                );
              });
            });

            describe('and all field values are valid', () => {
              it('updates the book', async () => {
                const bookToUpdate = {
                  id: storedBook.id,
                  description:
                    'A Novel About IT, DevOps, and Helping Your Business Win',
                } as Book;

                const book = await bookRepository.save(bookToUpdate);
                expect(book.id).toBe(storedBook.id);
                expect(book.title).toBe(storedBook.title);
                expect(book.description).toBe(bookToUpdate.description);
                expect(book.isbn).toBe(storedBook.isbn);
              });
            });
          });

          describe('and that specifies all the contents of the supertype', () => {
            describe('and some field values are invalid', () => {
              it('throws an exception', async () => {
                const bookToUpdate = audioBookFixture(
                  {
                    title: undefined,
                  },
                  storedBook.id,
                );

                await expect(bookRepository.save(bookToUpdate)).rejects.toThrow(
                  ValidationException,
                );
              });
            });

            describe('and all field values are valid', () => {
              it('updates the book', async () => {
                const bookToUpdate = bookFixture(
                  {
                    title: 'Continuous Delivery',
                    description:
                      'Boost your development productivity via automation',
                  },
                  storedBook.id,
                );

                const book = await bookRepository.save(bookToUpdate);
                expect(book.id).toBe(bookToUpdate.id);
                expect(book.title).toBe(bookToUpdate.title);
                expect(book.description).toBe(bookToUpdate.description);
                expect(book.isbn).toBe(bookToUpdate.isbn);
              });
            });
          });
        });

        describe('and that is of a subtype of Book', () => {
          beforeEach(async () => {
            const paperBookToStore = paperBookFixture();
            const storedPaperBookId = await insert(
              paperBookToStore,
              'books',
              PaperBook.name,
            );
            storedPaperBook = new PaperBook({
              ...paperBookToStore,
              id: storedPaperBookId,
            });

            const audioBookToStore = audioBookFixture();
            const storedAudioBookId = await insert(
              audioBookToStore,
              'books',
              AudioBook.name,
            );
            storedAudioBook = new AudioBook({
              ...audioBookToStore,
              id: storedAudioBookId,
            });
          });

          afterEach(async () => {
            await deleteAll('books');
          });

          describe('and that specifies partial contents of the subtype', () => {
            describe('and some field values are invalid', () => {
              it('throws an exception', async () => {
                const bookToUpdate = {
                  id: storedAudioBook.id,
                  hostingPlatforms: ['Spotify'],
                  isbn: undefined as unknown as string,
                } as AudioBook;

                await expect(bookRepository.save(bookToUpdate)).rejects.toThrow(
                  ValidationException,
                );
              });
            });

            describe('and all field values are valid', () => {
              it('updates the book', async () => {
                const bookToUpdate = {
                  id: storedAudioBook.id,
                  hostingPlatforms: ['Spotify'],
                } as AudioBook;

                const book = await bookRepository.save(bookToUpdate);
                expect(book.id).toBe(storedAudioBook.id);
                expect(book.title).toBe(storedAudioBook.title);
                expect(book.description).toBe(storedAudioBook.description);
                expect(book.hostingPlatforms).toEqual(
                  bookToUpdate.hostingPlatforms,
                );
              });
            });
          });

          describe('and that specifies all the contents of the subtype', () => {
            describe('and some field values are invalid', () => {
              it('throws an exception', async () => {
                const bookToUpdate = audioBookFixture(
                  {
                    title: 'The Pragmatic Programmer',
                    description: 'This book is a jewel for developers',
                    hostingPlatforms: undefined,
                  },
                  storedAudioBook.id,
                );

                await expect(bookRepository.save(bookToUpdate)).rejects.toThrow(
                  ValidationException,
                );
              });
            });

            describe('and all field values are valid', () => {
              it('updates the book', async () => {
                const bookToUpdate = audioBookFixture(
                  {
                    title: 'The Pragmatic Programmer',
                    description: 'This book is a jewel for developers',
                  },
                  storedAudioBook.id,
                );

                const book = await bookRepository.save(bookToUpdate);
                expect(book.id).toBe(bookToUpdate.id);
                expect(book.title).toBe(bookToUpdate.title);
                expect(book.description).toBe(bookToUpdate.description);
                expect(book.hostingPlatforms).toEqual(
                  bookToUpdate.hostingPlatforms,
                );
                expect(book.format).toEqual(bookToUpdate.format);
              });
            });
          });
        });
      });
    });
  });

  describe('when deleting a book', () => {
    describe('by an undefined ID', () => {
      it('throws an exception', async () => {
        await expect(
          bookRepository.deleteById(undefined as unknown as string),
        ).rejects.toThrow(IllegalArgumentException);
      });
    });

    describe('by a null ID', () => {
      it('throws an exception', async () => {
        await expect(
          bookRepository.deleteById(undefined as unknown as string),
        ).rejects.toThrow(IllegalArgumentException);
      });
    });

    describe('by the ID of a nonexistent book', () => {
      it('returns false', async () => {
        const isDeleted = await bookRepository.deleteById(
          '00007032a61c4eda79230000',
        );
        expect(isDeleted).toBe(false);
      });
    });

    describe('by the ID of an existent book', () => {
      beforeEach(async () => {
        const bookToStore = bookFixture();
        const storedBookId = await insert(bookToStore, 'books');
        storedBook = new Book({
          ...bookToStore,
          id: storedBookId,
        });
      });

      afterEach(async () => {
        await deleteAll('books');
      });

      it('returns true and the book has been effectively deleted', async () => {
        const isDeleted = await bookRepository.deleteById(storedBook.id!);
        expect(isDeleted).toBe(true);
        expect(await findById(storedBook.id!, 'books')).toBe(null);
      });
    });
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
