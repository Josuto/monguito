import {
  closeMongoConnection,
  deleteAll,
  findById,
  insert,
} from './util/mongo-server';
import {
  IllegalArgumentException,
  NotFoundException,
} from '../src/util/exceptions';
import { Optional } from 'typescript-optional';
import { AudioBook, Book, ElectronicBook, PaperBook } from './book';
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

  describe('when finding a book by ID', () => {
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

  describe('when finding a book by a custom field search value', () => {
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
    describe('providing no search filters', () => {
      it('then retrieves a list with all books', async () => {
        const books = await bookRepository.findAll();
        expect(books.length).toBe(3);
        expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
      });
    });

    describe('providing a search filter', () => {
      it('then retrieves a list with all books matching the filter', async () => {
        const filter = { __t: 'PaperBook' };
        const books = await bookRepository.findAll(filter);
        expect(books.length).toBe(1);
        expect(books).toEqual([storedPaperBook]);
      });

      describe('and providing a sort parameter', () => {
        it('then retrieves an ordered list with books matching the filter', async () => {
          const filter = { __t: ['PaperBook', 'AudioBook'] };
          const sortBy = { title: -1 };
          const books = await bookRepository.findAll(filter, sortBy);
          expect(books.length).toBe(2);
          expect(books).toEqual([storedAudioBook, storedPaperBook]);
        });
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
              ).rejects.toThrowError(NotFoundException);
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
