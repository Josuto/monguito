import {
  BookRepository,
  MongooseBookRepository,
} from './book-with-discriminator-key.repository';
import { AudioBookSchema, BookSchema, PaperBookSchema } from '../book.schema';
import {
  closeMongoConnection,
  deleteAll,
  findById,
  insert,
} from '../util/mongo-server';
import {
  AudioBookWithDiscriminatorKey,
  BookWithDiscriminatorKey,
  ElectronicBookWithDiscriminatorKey,
  PaperBookWithDiscriminatorKey,
} from './book-with-discriminator-key';
import {
  IllegalArgumentException,
  NotFoundException,
} from '../../src/util/exceptions';
import { Optional } from 'typescript-optional';
import mongoose from 'mongoose';

describe('Given an instance of book repository', () => {
  let bookRepository: BookRepository;
  let storedBook: BookWithDiscriminatorKey;
  let storedPaperBook: PaperBookWithDiscriminatorKey;
  let storedAudioBook: AudioBookWithDiscriminatorKey;

  beforeAll(async () => {
    const BookModel = mongoose.model('Book', BookSchema);
    BookModel.discriminator('Paper', PaperBookSchema);
    BookModel.discriminator('Audio', AudioBookSchema);
    bookRepository = new MongooseBookRepository(BookModel);
  });

  beforeEach(async () => {
    const bookToStore = new BookWithDiscriminatorKey({
      title: 'Accelerate',
      description:
        'Building and Scaling High Performing Technology Organizations',
      isbn: '1942788339',
    });
    const storedBookId = await insert(bookToStore, 'books');
    storedBook = new BookWithDiscriminatorKey({
      ...bookToStore,
      id: storedBookId,
    });

    const paperBookToStore = new PaperBookWithDiscriminatorKey({
      title: 'Effective Java',
      description: 'Great book on the Java programming language',
      edition: 3,
      isbn: '0134685997',
    });
    const storedPaperBookId = await insert(paperBookToStore, 'books');
    storedPaperBook = new PaperBookWithDiscriminatorKey({
      ...paperBookToStore,
      id: storedPaperBookId,
    });

    const audioBookToStore = new AudioBookWithDiscriminatorKey({
      title: 'The Sandman',
      description: 'Fantastic fantasy audio book',
      hostingPlatforms: ['Audible'],
      isbn: '5573899870',
    });
    const storedAudioBookId = await insert(audioBookToStore, 'books');
    storedAudioBook = new AudioBookWithDiscriminatorKey({
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

  describe('when finding all books', () => {
    it('then retrieves all the existent books', async () => {
      const books = await bookRepository.findAll();
      expect(books.length).toBe(3);
      expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
    });
  });

  describe('when saving a book', () => {
    describe('that has not been registered as a Mongoose discriminator', () => {
      it('throws an exception', async () => {
        const bookToInsert = new ElectronicBookWithDiscriminatorKey({
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
            bookRepository.save(
              undefined as unknown as BookWithDiscriminatorKey,
            ),
          ).rejects.toThrowError('The given element must be valid');
        });
      });

      describe('that is null', () => {
        it('then throws an exception', async () => {
          await expect(
            bookRepository.save(null as unknown as BookWithDiscriminatorKey),
          ).rejects.toThrowError('The given element must be valid');
        });
      });

      describe('that is new', () => {
        describe('and that is of supertype BookWithDiscriminatorKey', () => {
          describe('and specifies an ID', () => {
            it('then throws an exception', async () => {
              const bookToInsert = new BookWithDiscriminatorKey({
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
              const bookToInsert = new BookWithDiscriminatorKey({
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
        describe('and that is of a subtype of BookWithDiscriminatorKey', () => {
          it('then inserts the book', async () => {
            const bookToInsert = new PaperBookWithDiscriminatorKey({
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
        describe('and that is of BookWithDiscriminatorKey supertype', () => {
          describe('and that specifies partial contents of the supertype', () => {
            it('then updates the book', async () => {
              const bookToUpdate = {
                id: storedBook.id,
                description:
                  'A Novel About IT, DevOps, and Helping Your Business Win',
              } as BookWithDiscriminatorKey;

              const book = await bookRepository.save(bookToUpdate);
              expect(book.id).toBe(storedBook.id);
              expect(book.title).toBe(storedBook.title);
              expect(book.description).toBe(bookToUpdate.description);
            });
          });
          describe('and that specifies all the contents of the supertype', () => {
            it('then updates the book', async () => {
              const bookToUpdate = new BookWithDiscriminatorKey({
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
        describe('and that is of BookWithDiscriminatorKey subtype', () => {
          describe('and that specifies partial contents of the subtype', () => {
            it('then updates the book', async () => {
              const bookToUpdate = {
                id: storedAudioBook.id,
                hostingPlatforms: ['Spotify'],
              } as AudioBookWithDiscriminatorKey;

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
              const bookToUpdate = new AudioBookWithDiscriminatorKey({
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
