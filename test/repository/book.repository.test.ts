import { Optional } from 'typescript-optional';
import { IllegalArgumentException } from '../../src/util/exceptions';
import { AudioBook, Book, ElectronicBook, PaperBook } from '../domain/book';
import {
  closeMongoConnection,
  deleteAll,
  findById,
  insert,
} from '../util/mongo-server';
import { BookRepository, MongooseBookRepository } from './book.repository';

describe('Given an instance of book repository', () => {
  let bookRepository: BookRepository;
  let storedBook: Book;
  let storedPaperBook: PaperBook;
  let storedAudioBook: AudioBook;

  beforeAll(async () => {
    bookRepository = new MongooseBookRepository();
  });

  beforeEach(async () => {
    const bookToStore = new Book({
      title: 'Accelerate',
      description:
        'Building and Scaling High Performing Technology Organizations',
      isbn: '1942788339',
    });
    const storedBookId = await insert(bookToStore, 'books');
    storedBook = new Book({
      ...bookToStore,
      id: storedBookId,
    });

    const paperBookToStore = new PaperBook({
      title: 'Effective Java',
      description: 'Great book on the Java programming language',
      edition: 3,
      isbn: '0134685997',
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

    const audioBookToStore = new AudioBook({
      title: 'The Sandman',
      description: 'Fantastic fantasy audio book',
      hostingPlatforms: ['Audible'],
      isbn: '5573899870',
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

  describe('when searching a book by ID', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          bookRepository.findById(undefined as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          bookRepository.findById(null as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
      });
    });

    describe('by the ID of a nonexistent book', () => {
      it('then retrieves an empty book', async () => {
        const book = await bookRepository.findById('000000000000000000000001');
        expect(book).toEqual(Optional.empty());
      });
    });

    describe('by the ID of an existent book', () => {
      it('then retrieves the book', async () => {
        const book = await bookRepository.findById(storedPaperBook.id!);
        expect(book.isPresent()).toBe(true);
        expect(book.get()).toEqual(storedPaperBook);
      });
    });
  });

  describe('when searching a book by a custom field value', () => {
    describe('and the search value is undefined', () => {
      it('then throws an error', async () => {
        await expect(
          bookRepository.findByIsbn(undefined as unknown as string),
        ).rejects.toThrowError();
      });
    });

    describe('and the search value is null', () => {
      it('then throws an error', async () => {
        await expect(
          bookRepository.findByIsbn(null as unknown as string),
        ).rejects.toThrowError();
      });
    });

    describe('and there is no book matching the given search value', () => {
      it('then returns an empty book', async () => {
        const book = await bookRepository.findByIsbn('0000000000');
        expect(book).toEqual(Optional.empty());
      });
    });

    describe('and there is one book matching the given search value', () => {
      it('then returns a book matching the given search value', async () => {
        const book = await bookRepository.findByIsbn(storedBook.isbn);
        expect(book.isPresent()).toBe(true);
        expect(book.get()).toEqual(storedBook);
      });
    });
  });

  describe('when searching books', () => {
    describe('and not providing any optional parameter', () => {
      it('then retrieves a list with all books', async () => {
        const books = await bookRepository.findAll();
        expect(books.length).toBe(3);
        expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
      });
    });

    describe('and providing a value for the filter parameter', () => {
      describe('and such a field does not refer to an existing field in any Book type', () => {
        it('then retrieves an empty list of books', async () => {
          const filters = { fruit: 'Banana' };
          const books = await bookRepository.findAll({ filters });
          expect(books.length).toBe(0);
        });
      });

      describe('and such a value refers to an existing field in some Book type', () => {
        it('then retrieves a list with all books matching the filter', async () => {
          const filters = { __t: 'PaperBook' };
          const books = await bookRepository.findAll({ filters });
          expect(books.length).toBe(1);
          expect(books).toEqual([storedPaperBook]);
        });
      });
    });

    describe('and providing a value for the sort parameter', () => {
      describe('and such a value is invalid', () => {
        it('then throws an exception', async () => {
          const sortBy = { title: 2 };
          await expect(bookRepository.findAll({ sortBy })).rejects.toThrowError(
            IllegalArgumentException,
          );
        });
      });

      describe('and such a value is valid', () => {
        it('then retrieves an ordered list with books', async () => {
          const sortBy = { title: -1 };
          const books = await bookRepository.findAll({ sortBy });
          expect(books.length).toBe(3);
          expect(books).toEqual([storedAudioBook, storedPaperBook, storedBook]);
        });
      });
    });

    describe('and providing a value for the pagination parameter', () => {
      describe('and the page number is undefined', () => {
        describe('and the offset is undefined', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = {
              pageNumber: undefined as unknown as number,
              offset: -1,
            };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list one book', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = {
              pageNumber: null as unknown as number,
              offset: -1,
            };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list one book', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = {
              pageNumber: -1,
              offset: undefined as unknown as number,
            };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is null', () => {
          it('then throws an exception', async () => {
            const pageable = {
              pageNumber: -1,
              offset: null as unknown as number,
            };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is a negative number', () => {
          it('then throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: -1 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 0 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is one', () => {
          it('then throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 1 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('then throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 3 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('then throws an exception', async () => {
            const pageable = { pageNumber: -1, offset: 4 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });
      });

      describe('and the page number is zero', () => {
        describe('and the offset is undefined', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = { pageNumber: 0, offset: -1 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list one book', async () => {
            const pageable = { pageNumber: 0, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = { pageNumber: 1, offset: -1 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with one book', async () => {
            const pageable = { pageNumber: 1, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list with all books', async () => {
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
          it('then retrieves a list of all books', async () => {
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
          it('then retrieves a list of all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = { pageNumber: 3, offset: -1 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then retrieves a list of all books', async () => {
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
          it('then retrieves a list with one book', async () => {
            const pageable = { pageNumber: 3, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(1);
            expect(books).toEqual([storedAudioBook]);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('then retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 3, offset: 3 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('then retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 3, offset: 4 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });
      });

      describe('and the page number is bigger than the amount of all of the stored books', () => {
        describe('and the offset is undefined', () => {
          it('then retrieves a list of all books', async () => {
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
          it('then retrieves a list of all books', async () => {
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
          it('then throws an exception', async () => {
            const pageable = { pageNumber: 4, offset: -1 };
            await expect(
              bookRepository.findAll({ pageable }),
            ).rejects.toThrowError(IllegalArgumentException);
          });
        });

        describe('and the offset is zero', () => {
          it('then retrieves a list of all books', async () => {
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
          it('then retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 4, offset: 1 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });

        describe('and the offset is equals to the amount of all of the stored books', () => {
          it('then retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 4, offset: 3 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });

        describe('and the offset is bigger than the amount of all of the stored books', () => {
          it('then retrieves an empty list of books', async () => {
            const pageable = { pageNumber: 4, offset: 4 };
            const books = await bookRepository.findAll({ pageable });
            expect(books.length).toBe(0);
          });
        });
      });
    });

    describe('and providing a valid value for all optional parameters', () => {
      it('then retrieves an ordered list with books matching the filter', async () => {
        const filters = { __t: ['PaperBook', 'AudioBook'] };
        const sortBy = { title: -1 };
        const pageable = { pageNumber: 1, offset: 1 };
        const books = await bookRepository.findAll({
          filters,
          sortBy,
          pageable,
        });
        expect(books.length).toBe(1);
        expect(books).toEqual([storedAudioBook]);
      });
    });
  });

  describe('when saving a book', () => {
    describe('that has not been registered as a Mongoose discriminator', () => {
      it('throws an exception', async () => {
        const bookToInsert = new ElectronicBook({
          title: 'How to deal with ants at home?',
          description: 'Shows several strategies to avoid having ants at home',
          extension: 'epub',
          isbn: '6875234013',
        });
        await expect(bookRepository.save(bookToInsert)).rejects.toThrowError();
      });
    });

    describe('that has been registered as a Mongoose discriminator', () => {
      describe('that is undefined', () => {
        it('then throws an exception', async () => {
          await expect(
            bookRepository.save(undefined as unknown as Book),
          ).rejects.toThrowError('The given entity must be valid');
        });
      });

      describe('that is null', () => {
        it('then throws an exception', async () => {
          await expect(
            bookRepository.save(null as unknown as Book),
          ).rejects.toThrowError('The given entity must be valid');
        });
      });

      describe('that is new', () => {
        describe('and that is of supertype Book', () => {
          describe('and specifies an ID', () => {
            it('then throws an exception', async () => {
              const bookToInsert = new Book({
                id: '00007032a61c4eda79230000',
                title: 'Continuous Delivery',
                description:
                  'Reliable Software Releases Through Build, Test, and Deployment Automation',
                isbn: '9780321601919',
              });

              await expect(
                bookRepository.save(bookToInsert),
              ).rejects.toThrowError(IllegalArgumentException);
            });
          });

          describe('and does not specify an ID', () => {
            it('then inserts the book', async () => {
              const bookToInsert = new Book({
                title: 'Continuous Delivery',
                description:
                  'Reliable Software Releases Through Build, Test, and Deployment Automation',
                isbn: '9780321601919',
              });

              const book = await bookRepository.save(bookToInsert);
              expect(book.id).toBeTruthy();
              expect(book.title).toBe(bookToInsert.title);
              expect(book.description).toBe(bookToInsert.description);
            });
          });
        });
        describe('and that is of a subtype of Book', () => {
          it('then inserts the book', async () => {
            const bookToInsert = new PaperBook({
              title: 'Implementing Domain-Driven Design',
              description: 'Describes Domain-Driven Design in depth',
              edition: 1,
              isbn: '9780321834577',
            });

            const book = await bookRepository.save(bookToInsert);
            expect(book.id).toBeTruthy();
            expect(book.title).toBe(bookToInsert.title);
            expect(book.description).toBe(bookToInsert.description);
            expect(book.edition).toBe(bookToInsert.edition);
          });
        });
      });

      describe('that is not new', () => {
        describe('and that is of Book supertype', () => {
          describe('and that specifies partial contents of the supertype', () => {
            it('then updates the book', async () => {
              const bookToUpdate = {
                id: storedBook.id,
                description:
                  'A Novel About IT, DevOps, and Helping Your Business Win',
              } as Book;

              const book = await bookRepository.save(bookToUpdate);
              expect(book.id).toBe(storedBook.id);
              expect(book.title).toBe(storedBook.title);
              expect(book.description).toBe(bookToUpdate.description);
            });
          });
          describe('and that specifies all the contents of the supertype', () => {
            it('then updates the book', async () => {
              const bookToUpdate = new Book({
                id: storedBook.id,
                title: 'The Phoenix Project',
                description:
                  'A Novel About IT, DevOps, and Helping Your Business Win',
                isbn: '1942788290',
              });

              const book = await bookRepository.save(bookToUpdate);
              expect(book.id).toBe(bookToUpdate.id);
              expect(book.title).toBe(bookToUpdate.title);
              expect(book.description).toBe(bookToUpdate.description);
            });
          });
        });
        describe('and that is of Book subtype', () => {
          describe('and that specifies partial contents of the subtype', () => {
            it('then updates the book', async () => {
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
          describe('and that specifies all the contents of the subtype', () => {
            it('then updates the book', async () => {
              const bookToUpdate = new AudioBook({
                id: storedAudioBook.id,
                title: 'Don Quixote',
                description: 'Important classic in Spanish literature',
                hostingPlatforms: ['Spotify'],
                format: 'mp3',
                isbn: '0142437239',
              });

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

  describe('when deleting a book', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          bookRepository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          bookRepository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
      });
    });

    describe('by the ID of a nonexistent book', () => {
      it('then returns false', async () => {
        const isDeleted = await bookRepository.deleteById(
          '00007032a61c4eda79230000',
        );
        expect(isDeleted).toBe(false);
      });
    });

    describe('by the ID of an existent book', () => {
      it('then returns true and the book has been effectively deleted', async () => {
        const isDeleted = await bookRepository.deleteById(storedBook.id!);
        expect(isDeleted).toBe(true);
        expect(await findById(storedBook.id!, 'books')).toBe(null);
      });
    });
  });

  afterEach(async () => {
    await deleteAll('books');
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
