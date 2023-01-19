import {
  AudioBookSchema,
  BookRepository,
  BookSchema,
  MongooseBookRepository,
  PaperBookSchema,
} from './book.repository';
import { Test, TestingModule } from '@nestjs/testing';
import {
  closeMongoConnection,
  deleteAll,
  findById,
  insert,
  rootMongooseTestModule,
} from '../../test-util/mongo-server';
import { MongooseModule } from '@nestjs/mongoose';
import { AudioBook, Book, PaperBook, VideoBook } from './book';
import { IllegalArgumentException, NotFoundException } from '../exceptions';
import { Optional } from 'typescript-optional';

describe('Given an instance of book repository', () => {
  let repository: BookRepository;
  let storedBook: Book;
  let storedPaperBook: PaperBook;
  let storedAudioBook: AudioBook;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          {
            name: Book.name,
            schema: BookSchema,
            discriminators: [
              { name: 'Paper', schema: PaperBookSchema },
              { name: 'Audio', schema: AudioBookSchema },
            ],
          },
        ]),
      ],
      providers: [MongooseBookRepository],
    }).compile();

    repository = module.get<BookRepository>(MongooseBookRepository);
  });

  beforeEach(async () => {
    const bookToStore = new Book({
      title: 'Accelerate',
      description:
        'Building and Scaling High Performing Technology Organizations',
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
    });
    const storedPaperBookId = await insert(paperBookToStore, 'books');
    storedPaperBook = new PaperBook({
      ...paperBookToStore,
      id: storedPaperBookId,
    });

    const audioBookToStore = new AudioBook({
      title: 'The Sandman',
      description: 'Fantastic fantasy audio book',
      hostingPlatforms: ['Audible'],
    });
    const storedAudioBookId = await insert(audioBookToStore, 'books');
    storedAudioBook = new AudioBook({
      ...audioBookToStore,
      id: storedAudioBookId,
    });
  });

  describe('when finding a book', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.findById(undefined as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.findById(null as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
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
        const book = await repository.findById(storedPaperBook.id!);
        expect(book.isPresent()).toBe(true);
        expect(book.get()).toEqual(storedPaperBook);
      });
    });
  });

  describe('when finding all books', () => {
    it('then retrieves all the existent books', async () => {
      const books = await repository.findAll();
      expect(books.length).toBe(3);
      expect(books).toEqual([storedBook, storedPaperBook, storedAudioBook]);
    });
  });

  describe('when saving a book', () => {
    describe('that has not been registered as a Mongoose discriminator', () => {
      describe('that is new', () => {
        it('throws an exception', async () => {
          const bookToInsert = new VideoBook({
            title: 'How to deal with ants at home?',
            description:
              'Shows several strategies to avoid having ants at home',
            format: 'AVI',
          });
          await expect(repository.save(bookToInsert)).rejects.toThrowError();
        });
      });

      describe('that is not new', () => {
        it('throws an exception', async () => {
          const bookToUpdate = new VideoBook({
            id: storedAudioBook.id,
            title: 'How to deal with ants at home?',
            description:
              'Shows several strategies to avoid having ants at home',
            format: 'AVI',
          });
          await expect(repository.save(bookToUpdate)).rejects.toThrowError();
        });
      });
    });

    describe('that has been registered as a Mongoose discriminator', () => {
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

      describe('that is new', () => {
        describe('and that is of supertype Book', () => {
          describe('and specifies an ID', () => {
            it('then throws an exception', async () => {
              const bookToInsert = new Book({
                id: '00007032a61c4eda79230000',
                title: 'Continuous Delivery',
                description:
                  'Reliable Software Releases Through Build, Test, and Deployment Automation',
              });

              await expect(repository.save(bookToInsert)).rejects.toThrowError(
                NotFoundException,
              );
            });
          });

          describe('and does not specify an ID', () => {
            it('then inserts the book', async () => {
              const bookToInsert = new Book({
                title: 'Continuous Delivery',
                description:
                  'Reliable Software Releases Through Build, Test, and Deployment Automation',
              });

              const book = await repository.save(bookToInsert);
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
            });

            const book = await repository.save(bookToInsert);
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

              const book = await repository.save(bookToUpdate);
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
              });

              const book = await repository.save(bookToUpdate);
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

              const book = await repository.save(bookToUpdate);
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
              });

              const book = await repository.save(bookToUpdate);
              expect(book.id).toBe(bookToUpdate.id);
              expect(book.title).toBe(bookToUpdate.title);
              expect(book.description).toBe(bookToUpdate.description);
              expect(book.hostingPlatforms).toEqual(
                bookToUpdate.hostingPlatforms,
              );
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
          repository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError(IllegalArgumentException);
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
        const isDeleted = await repository.deleteById(storedBook.id!);
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
