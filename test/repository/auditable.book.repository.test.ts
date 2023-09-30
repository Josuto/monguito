import { Repository } from '../../src';
import { AuditableBook, AuditablePaperBook } from '../domain/auditable.book';
import {
  closeMongoConnection,
  deleteAll,
  setupConnection,
} from '../util/mongo-server';
import { AuditableMongooseBookRepository } from './auditable.book.repository';

describe('', () => {
  let bookRepository: Repository<AuditableBook>;

  beforeAll(async () => {
    setupConnection();
    bookRepository = new AuditableMongooseBookRepository();
  });

  describe('Given an instance of auditable book repository', () => {
    describe('when saving an auditable book', () => {
      describe('that is new', () => {
        describe('and that is of supertype AuditableBook', () => {
          it('then the inserted book includes the expected audit data', async () => {
            const bookToInsert = new AuditableBook({
              title: 'Continuous Delivery',
              description:
                'Reliable Software Releases Through Build, Test, and Deployment Automation',
              isbn: '9780321601919',
            });

            const auditableBook = await bookRepository.save(bookToInsert);
            expect(auditableBook).toHaveProperty('createdAt');
            expect(auditableBook).toHaveProperty('updatedAt');
          });
        });

        describe('and that is of a subtype of AuditableBook', () => {
          it('then the inserted book includes the expected audit data', async () => {
            const bookToInsert = new AuditablePaperBook({
              title: 'Implementing Domain-Driven Design',
              description: 'Describes Domain-Driven Design in depth',
              edition: 1,
              isbn: '9780321834577',
            });

            const auditableBook = await bookRepository.save(bookToInsert);
            expect(auditableBook).toHaveProperty('createdAt');
            expect(auditableBook).toHaveProperty('updatedAt');
          });
        });
      });

      describe('that is not new', () => {
        let storedAuditableBook: AuditableBook;

        beforeEach(async () => {
          const auditableBook = new AuditableBook({
            title: 'The Phoenix Project',
            description:
              'Building and Scaling High Performing Technology Organizations',
            isbn: '1942788339',
          });
          storedAuditableBook = await bookRepository.save(auditableBook);
        });

        describe('and that is of supertype AuditableBook', () => {
          it('then the updated book includes the expected audit data', async () => {
            const bookToUpdate = {
              id: storedAuditableBook.id,
              description:
                'A Novel About IT, DevOps, and Helping Your Business Win',
            } as AuditableBook;

            const auditableBook = await bookRepository.save(bookToUpdate);
            expect(auditableBook.createdAt).toEqual(
              storedAuditableBook.createdAt,
            );
            expect(auditableBook.updatedAt?.getTime()).toBeGreaterThan(
              storedAuditableBook.updatedAt!.getTime(),
            );
          });
        });

        describe('and that is of a subtype of AuditableBook', () => {
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
            );
          });

          it('then the updated book includes the expected audit data', async () => {
            const bookToUpdate = {
              id: storedAuditablePaperBook.id,
              edition: 4,
            } as AuditablePaperBook;

            const auditablePaperBook = await bookRepository.save(bookToUpdate);
            expect(auditablePaperBook.createdAt).toEqual(
              storedAuditablePaperBook.createdAt,
            );
            expect(auditablePaperBook.updatedAt?.getTime()).toBeGreaterThan(
              storedAuditablePaperBook.updatedAt!.getTime(),
            );
          });
        });

        afterEach(async () => {
          await deleteAll('auditablebooks');
        });
      });
    });
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
