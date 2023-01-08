import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import {
  closeMongoConnection,
  deleteAll,
  findById,
  insert,
  rootMongooseTestModule,
} from '../../test/mongo-server';
import { Optional } from 'typescript-optional';
import { Author } from './author';
import {
  AuthorRepository,
  AuthorSchema,
  MongooseAuthorRepository,
} from './author.repository';
import {
  IllegalArgumentException,
  NotFoundException,
  UniquenessViolationException,
} from '../exceptions';

describe('Given an instance of author repository', () => {
  let repository: AuthorRepository;
  let storedAuthor: Author;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          {
            name: Author.name,
            schema: AuthorSchema,
          },
        ]),
      ],
      providers: [MongooseAuthorRepository],
    }).compile();

    repository = module.get<AuthorRepository>(MongooseAuthorRepository);
  });

  beforeEach(async () => {
    const authorToStore = new Author({
      firstName: 'Joshua',
      surname: 'Bloch',
      email: 'joshua.block@example.com',
    });
    const storedAuthorId = await insert(authorToStore, 'authors');
    storedAuthor = new Author({
      ...authorToStore,
      id: storedAuthorId,
    });
  });

  describe('when finding an author', () => {
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

    describe('by the ID of a nonexistent author', () => {
      it('then retrieves an empty author', async () => {
        const author = await repository.findById('000000000000000000000001');
        expect(author).toEqual(Optional.empty());
      });
    });

    describe('by the ID of an existent author', () => {
      it('then retrieves the author', async () => {
        const author = await repository.findById(storedAuthor.id!);
        expect(author.get()).toEqual(storedAuthor);
      });
    });
  });

  describe('when finding all the authors', () => {
    it('then retrieves all the existent authors', async () => {
      const authors = await repository.findAll();
      expect(authors.length).toBe(1);
      expect(authors).toContainEqual(storedAuthor);
    });
  });

  describe('when saving an author', () => {
    describe('that is undefined', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.save(undefined as unknown as Author),
        ).rejects.toThrowError('The given element must be valid');
      });
    });

    describe('that is null', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.save(null as unknown as Author),
        ).rejects.toThrowError('The given element must be valid');
      });
    });

    describe('that is new but specifies an ID', () => {
      it('then throws an exception', async () => {
        const authorToUpdate = new Author({
          id: '00007032a61c4eda79230000',
          firstName: 'Robert',
          surname: 'Martin',
          email: 'uncle.bob@example.com',
        });

        await expect(repository.save(authorToUpdate)).rejects.toThrowError(
          NotFoundException,
        );
      });
    });

    describe('that specifies the email (unique value) of a stored author', () => {
      it('then throws an exception', async () => {
        const authorToInsert = new Author({
          firstName: 'Kent',
          surname: 'Beck',
          email: 'joshua.block@example.com',
        });

        await expect(repository.save(authorToInsert)).rejects.toThrowError(
          UniquenessViolationException,
        );
      });
    });

    describe('that is new', () => {
      it('then inserts the author', async () => {
        const authorToInsert = new Author({
          firstName: 'Kent',
          surname: 'Beck',
          email: 'kent.beck@example.com',
        });

        const author = await repository.save(authorToInsert);
        expect(author.id).toBeTruthy();
        expect(author.firstName).toBe(authorToInsert.firstName);
        expect(author.surname).toBe(authorToInsert.surname);
        expect(author.email).toBe(authorToInsert.email);
      });
    });

    describe('that is not new', () => {
      it('then updates the author', async () => {
        const authorToUpdate = new Author({
          id: storedAuthor.id,
          firstName: 'Martin',
          surname: 'Fowler',
          email: 'martin.fowler@example.com',
        });

        const author = await repository.save(authorToUpdate);
        expect(author.id).toBe(authorToUpdate.id);
        expect(author.firstName).toBe(authorToUpdate.firstName);
        expect(author.surname).toBe(authorToUpdate.surname);
        expect(author.email).toBe(authorToUpdate.email);
      });
    });
  });

  describe('when deleting an author', () => {
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

    describe('by the ID of a nonexistent author', () => {
      it('then returns false', async () => {
        const isDeleted = await repository.deleteById(
          '00007032a61c4eda79230000',
        );
        expect(isDeleted).toBe(false);
      });
    });

    describe('by the ID of an existent author', () => {
      it('then returns true and the author has been effectively deleted', async () => {
        const isDeleted = await repository.deleteById(storedAuthor.id!);
        expect(isDeleted).toBe(true);
        expect(await findById(storedAuthor.id!, 'authors')).toBe(null);
      });
    });
  });

  afterEach(async () => {
    await deleteAll('authors');
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
