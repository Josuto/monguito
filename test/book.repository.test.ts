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
  insert,
  rootMongooseTestModule,
} from './mongo-server';
import { MongooseModule } from '@nestjs/mongoose';
import { AudioBook, Book, PaperBook, VideoBook } from './book';

describe('Given an instance of book repository', () => {
  let repository: BookRepository;
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
    describe('by the ID of an existent book', () => {
      it('then retrieves the book', async () => {
        const book = await repository.findById(storedPaperBook.id!);
        expect(book.isPresent()).toBe(true);
        expect(book.get()).toEqual(storedPaperBook);
      });
    });
  });

  describe('when finding all the books', () => {
    it('then retrieves all the existent books', async () => {
      const books = await repository.findAll();
      expect(books.length).toBe(2);
      expect(books).toEqual([storedPaperBook, storedAudioBook]);
    });
  });

  describe('when saving a book', () => {
    describe('which type is not specified as a book discriminator', () => {
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

    describe('that is new', () => {
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

    describe('that is not new', () => {
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
        expect(book.hostingPlatforms).toEqual(bookToUpdate.hostingPlatforms);
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
