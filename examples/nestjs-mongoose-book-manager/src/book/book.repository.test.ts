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
} from '../test-util/mongo-server';
import { MongooseModule } from '@nestjs/mongoose';
import { AudioBook, Book, PaperBook } from './book';

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
      title: 'The Sandman Overture',
      description: 'Fantastic fantasy comic book',
      edition: 2,
    });
    const storedPaperBookId = await insert(paperBookToStore, 'books');
    storedPaperBook = new PaperBook({
      ...paperBookToStore,
      id: storedPaperBookId,
    });

    const audioBookToStore = new AudioBook({
      title: 'The Sandman Overture',
      description: 'Fantastic fantasy audio book',
      hostingPlatforms: ['Audible'],
    });
    const storedAudioBookId = await insert(audioBookToStore, 'books');
    storedAudioBook = new AudioBook({
      ...audioBookToStore,
      id: storedAudioBookId,
    });
  });

  describe('when finding a book by title', () => {
    describe('and the title is undefined', () => {
      it('then throws an error', async () => {
        await expect(
          repository.findById(undefined as unknown as string),
        ).rejects.toThrowError();
      });
    });

    describe('and the title is null', () => {
      it('then throws an error', async () => {
        await expect(
          repository.findById(null as unknown as string),
        ).rejects.toThrowError();
      });
    });

    describe('and there is no book matching the given title', () => {
      it('then returns an empty list', async () => {
        const books = await repository.findByTitle('The Lord of the Rings');
        expect(books.length).toEqual(0);
      });
    });

    describe('and there is one book matching the given title', () => {
      it('then returns list with a book matching the given title', async () => {
        const books = await repository.findByTitle(storedBook.title);
        expect(books.length).toEqual(1);
        expect(books[0]).toEqual(storedBook);
      });
    });

    describe('and there is more than one book matching the given title', () => {
      it('then returns list with the books matching the given title', async () => {
        const books = await repository.findByTitle(storedPaperBook.title);
        expect(books.length).toEqual(2);
        expect(books[0]).toEqual(storedPaperBook);
        expect(books[1]).toEqual(storedAudioBook);
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
