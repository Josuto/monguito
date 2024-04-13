import { Repository } from '../../src';
import { AuditableBook, AuditablePaperBook } from '../domain/auditable.book';
import {
  closeMongoConnection,
  deleteAll,
  setupConnection,
} from '../util/mongo-server';
import { MongooseAuditableBookRepository } from './auditable.book.repository';

describe('Given an instance of auditable book repository and a user ID', () => {
  let bookRepository: Repository<AuditableBook>;
  const createdBy = '1234';

  beforeAll(async () => {
    setupConnection();
    bookRepository = new MongooseAuditableBookRepository();
  });

  describe('when creating an auditable book', () => {
    describe('that is of supertype AuditableBook', () => {
      it('then the inserted book includes the expected audit data', async () => {
        const bookToInsert = new AuditableBook({
          title: 'Continuous Delivery',
          description:
            'Reliable Software Releases Through Build, Test, and Deployment Automation',
          isbn: '9780321601919',
        });

        const auditableBook = await bookRepository.save(bookToInsert, {
          userId: createdBy,
        });
        expect(auditableBook.createdAt).toBeDefined();
        expect(auditableBook.updatedAt).toBeDefined();
        expect(auditableBook.createdBy).toEqual(createdBy);
        expect(auditableBook.updatedBy).toEqual(createdBy);
        expect(auditableBook.version).toBe(0);
      });
    });

    describe('that is of a subtype of AuditableBook', () => {
      it('then the inserted book includes the expected audit data', async () => {
        const bookToInsert = new AuditablePaperBook({
          title: 'Implementing Domain-Driven Design',
          description: 'Describes Domain-Driven Design in depth',
          edition: 1,
          isbn: '9780321834577',
        });

        const auditableBook = await bookRepository.save(bookToInsert, {
          userId: createdBy,
        });
        expect(auditableBook.createdAt).toBeDefined();
        expect(auditableBook.updatedAt).toBeDefined();
        expect(auditableBook.createdBy).toEqual(createdBy);
        expect(auditableBook.updatedBy).toEqual(createdBy);
        expect(auditableBook.version).toBe(0);
      });
    });
  });

  describe('when updating an auditable book', () => {
    let storedAuditableBook: AuditableBook;
    const updatedBy = '5678';

    beforeEach(async () => {
      const auditableBook = new AuditableBook({
        title: 'The Phoenix Project',
        description:
          'Building and Scaling High Performing Technology Organizations',
        isbn: '1942788339',
      });
      storedAuditableBook = await bookRepository.save(auditableBook, {
        userId: createdBy,
      });
    });

    describe('that is of supertype AuditableBook', () => {
      it('then the updated book includes the expected audit data', async () => {
        const bookToUpdate = {
          id: storedAuditableBook.id,
          description:
            'A Novel About IT, DevOps, and Helping Your Business Win',
        } as AuditableBook;

        const auditableBook = await bookRepository.save(bookToUpdate, {
          userId: '5678',
        });

        expect(auditableBook.createdAt).toEqual(storedAuditableBook.createdAt);
        expect(auditableBook.updatedAt?.getTime()).toBeGreaterThan(
          storedAuditableBook.updatedAt!.getTime(),
        );
        expect(auditableBook.createdBy).toEqual(createdBy);
        expect(auditableBook.updatedBy).toEqual(updatedBy);
        expect(auditableBook.version).toBe(1);
      });
    });

    describe('that is of a subtype of AuditableBook', () => {
      let storedAuditablePaperBook: AuditablePaperBook;

      beforeEach(async () => {
        const auditablePaperBook = new AuditablePaperBook({
          title: 'Effective Java',
          description: 'Great book on the Java programming language',
          edition: 3,
          isbn: '0134685997',
        });

        storedAuditablePaperBook = await bookRepository.save(
          auditablePaperBook,
          { userId: createdBy },
        );
      });

      it('then the updated book includes the expected audit data', async () => {
        const bookToUpdate = {
          id: storedAuditablePaperBook.id,
          edition: 4,
        } as AuditablePaperBook;

        const auditableBook = await bookRepository.save(bookToUpdate, {
          userId: updatedBy,
        });
        expect(auditableBook.createdAt).toEqual(
          storedAuditablePaperBook.createdAt,
        );
        expect(auditableBook.updatedAt?.getTime()).toBeGreaterThan(
          storedAuditablePaperBook.updatedAt!.getTime(),
        );
        expect(auditableBook.createdBy).toEqual(createdBy);
        expect(auditableBook.updatedBy).toEqual(updatedBy);
        expect(auditableBook.version).toBe(1);
      });
    });
  });

  afterEach(async () => {
    await deleteAll('auditablebooks');
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
