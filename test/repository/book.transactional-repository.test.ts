import { PartialEntityWithId, TransactionalRepository } from '../../src';
import {
  IllegalArgumentException,
  ValidationException,
} from '../../src/util/exceptions';
import { Book, PaperBook } from '../domain/book';
import {
  bookFixture,
  electronicBookFixture,
  paperBookFixture,
} from '../domain/book.fixtures';
import {
  MongoServerType,
  closeMongoConnection,
  deleteAll,
  findOne,
  insert,
  setupConnection,
} from '../util/mongo-server';
import { MongooseBookTransactionalRepository } from './book.transactional-repository';

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('Given an instance of book repository', () => {
  let bookRepository: TransactionalRepository<Book>;

  beforeAll(async () => {
    await setupConnection(MongoServerType.REPLICA_SET);
    bookRepository = new MongooseBookTransactionalRepository();
    // Wait until the repository is properly connected to Mongoose's connection
    await sleep(50);
  });

  describe('when saving a list of books', () => {
    describe('that is empty', () => {
      it('returns an empty list of books', async () => {
        const books = await bookRepository.saveAll([]);

        expect(books).toEqual([]);
      });
    });

    describe('that includes a book that is undefined', () => {
      it('throws an exception', async () => {
        const booksToStore = [
          bookFixture({ isbn: '1942788344' }),
          undefined as unknown as Book,
        ];
        await expect(bookRepository.saveAll(booksToStore)).rejects.toThrow(
          IllegalArgumentException,
        );
        expect(
          await findOne({ isbn: booksToStore[0].isbn }, 'books'),
        ).toBeNull();
      });
    });

    describe('that includes a book that is null', () => {
      it('throws an exception', async () => {
        const booksToStore = [
          bookFixture({ isbn: '1942788345' }),
          null as unknown as Book,
        ];
        await expect(bookRepository.saveAll(booksToStore)).rejects.toThrow(
          IllegalArgumentException,
        );
        expect(
          await findOne({ isbn: booksToStore[0].isbn }, 'books'),
        ).toBeNull();
      });
    });

    describe('that includes a book which type is not registered in the repository', () => {
      it('throws an exception', async () => {
        const booksToStore = [
          bookFixture({ isbn: '1942788340' }),
          electronicBookFixture({ isbn: '1942788341' }),
        ];
        await expect(bookRepository.saveAll(booksToStore)).rejects.toThrow(
          IllegalArgumentException,
        );
        expect(
          await findOne(
            { isbn: { $in: [booksToStore[0].isbn, booksToStore[1].isbn] } },
            'books',
          ),
        ).toBeNull();
      });
    });

    describe('that includes books which type are registered in the repository', () => {
      describe('and all of the books are new', () => {
        describe('and all of the books are of the same type', () => {
          describe('and some field values of one book are invalid', () => {
            it('throws an exception', async () => {
              const booksToStore = [
                bookFixture({ isbn: '1942788346' }),
                bookFixture({ isbn: undefined }),
              ];
              await expect(
                bookRepository.saveAll(booksToStore),
              ).rejects.toThrow(ValidationException);
              expect(
                await findOne({ isbn: booksToStore[0].isbn }, 'books'),
              ).toBeNull();
            });
          });

          describe('and all of the books specify valid field values', () => {
            it('inserts the books', async () => {
              const booksToStore = [
                bookFixture({ isbn: '1942788342' }),
                bookFixture({ isbn: '1942788343' }),
              ];
              const savedBooks = await bookRepository.saveAll(booksToStore);
              expect(savedBooks.length).toBe(2);
            });
          });
        });

        describe('and each book is of a different type', () => {
          describe('and some field values of one book are invalid', () => {
            it('throws an exception', async () => {
              const booksToStore = [
                bookFixture({ isbn: '1942788347' }),
                paperBookFixture({ isbn: undefined }),
              ];
              await expect(
                bookRepository.saveAll(booksToStore),
              ).rejects.toThrow(ValidationException);
              expect(
                await findOne({ isbn: booksToStore[0].isbn }, 'books'),
              ).toBeNull();
            });
          });

          describe('and all of the books specify valid field values', () => {
            it('inserts the books', async () => {
              const booksToStore = [
                bookFixture({ isbn: '1942788342' }),
                paperBookFixture({ isbn: '1942788343' }),
              ];
              const savedBooks = await bookRepository.saveAll(booksToStore);
              expect(savedBooks.length).toBe(2);
            });
          });
        });
      });

      describe('and all of the books already exist', () => {
        describe('and all of the books are of the same type', () => {
          let storedPaperBook1: PaperBook, storedPaperBook2: PaperBook;

          beforeEach(async () => {
            let paperBookToStore = paperBookFixture({ isbn: '1942788342' });
            let storedPaperBookId = await insert(
              paperBookToStore,
              'books',
              PaperBook.name,
            );
            storedPaperBook1 = new PaperBook({
              ...paperBookToStore,
              id: storedPaperBookId,
            });

            paperBookToStore = paperBookFixture({ isbn: '1942788343' });
            storedPaperBookId = await insert(
              paperBookToStore,
              'books',
              PaperBook.name,
            );
            storedPaperBook2 = new PaperBook({
              ...paperBookToStore,
              id: storedPaperBookId,
            });
          });

          describe('and some field values of one book are invalid', () => {
            it('throws an exception', async () => {
              const booksToStore = [
                paperBookFixture(
                  {
                    isbn: '1942788342',
                    title: 'New title',
                  },
                  storedPaperBook1.id,
                ),
                paperBookFixture({ isbn: undefined }, storedPaperBook2.id),
              ];
              await expect(
                bookRepository.saveAll(booksToStore),
              ).rejects.toThrow(ValidationException);

              const storedBooks = await bookRepository.findAll();
              expect(storedBooks).toEqual([storedPaperBook1, storedPaperBook2]);
            });
          });

          describe('and all of the books specify valid field values', () => {
            it('updates the books', async () => {
              const booksToStore = [
                paperBookFixture(
                  {
                    isbn: '1942788342',
                    title: 'New title',
                  },
                  storedPaperBook1.id,
                ),
                paperBookFixture(
                  {
                    isbn: '1942788343',
                    title: 'New title',
                  },
                  storedPaperBook2.id,
                ),
              ];
              const savedBooks = await bookRepository.saveAll(booksToStore);
              expect(savedBooks).toEqual(booksToStore);
            });
          });
        });

        describe('and each book is of a different type', () => {
          let storedBook: Book, storedPaperBook: PaperBook;

          beforeEach(async () => {
            const bookToStore = bookFixture({ isbn: '1942788342' });
            const storedBookId = await insert(bookToStore, 'books');
            storedBook = new Book({
              ...bookToStore,
              id: storedBookId,
            });

            const paperBookToStore = paperBookFixture({ isbn: '1942788343' });
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

          describe('and some field values of one book are invalid', () => {
            it('throws an exception', async () => {
              const booksToStore = [
                bookFixture(
                  {
                    isbn: '1942788342',
                    title: 'New title',
                  },
                  storedBook.id,
                ),
                paperBookFixture({ isbn: undefined }, storedPaperBook.id),
              ];
              await expect(
                bookRepository.saveAll(booksToStore),
              ).rejects.toThrow(ValidationException);

              const storedBooks = await bookRepository.findAll();
              expect(storedBooks).toEqual([storedBook, storedPaperBook]);
            });
          });

          describe('and all of the books specify valid field values', () => {
            it('updates the books', async () => {
              const booksToStore = [
                bookFixture(
                  {
                    isbn: '1942788342',
                    title: 'New title',
                  },
                  storedBook.id,
                ),
                paperBookFixture(
                  {
                    isbn: '1942788343',
                    title: 'New title',
                  },
                  storedPaperBook.id,
                ),
              ];
              const savedBooks = await bookRepository.saveAll(booksToStore);
              expect(savedBooks).toEqual(booksToStore);
            });
          });
        });
      });

      describe('and one book is new while another already exists', () => {
        let storedPaperBook: PaperBook;

        beforeEach(async () => {
          const paperBookToStore = paperBookFixture({ isbn: '1942788342' });
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

        describe('and all of the books are of the same type', () => {
          describe('and some field values of one book are invalid', () => {
            it('throws an exception', async () => {
              const booksToStore = [
                paperBookFixture(
                  { isbn: '1942788342', title: 'New title' },
                  storedPaperBook.id,
                ),
                paperBookFixture({ isbn: undefined }),
              ];
              await expect(
                bookRepository.saveAll(booksToStore),
              ).rejects.toThrow(ValidationException);

              const storedBooks = await bookRepository.findAll();
              expect(storedBooks).toEqual([storedPaperBook]);
            });
          });

          describe('and all of the books specify valid field values', () => {
            describe('and the book to update has partial content', () => {
              it('updates the books', async () => {
                const newBook = paperBookFixture({ isbn: '1942788343' });
                const existingBook = {
                  id: storedPaperBook.id,
                  title: 'New title',
                } as PartialEntityWithId<PaperBook>;
                const savedBooks = await bookRepository.saveAll([
                  newBook,
                  existingBook,
                ]);
                expect(savedBooks.length).toBe(2);
                expect(savedBooks[0].isbn).toEqual(newBook.isbn);
                expect(savedBooks[0].title).toEqual(newBook.title);
                expect(savedBooks[0].description).toEqual(newBook.description);
                expect(savedBooks[0].edition).toEqual(newBook.edition);
                expect(savedBooks[1].id).toEqual(existingBook.id);
                expect(savedBooks[1].isbn).toEqual(storedPaperBook.isbn);
                expect(savedBooks[1].title).toEqual(existingBook.title);
                expect(savedBooks[1].description).toEqual(
                  storedPaperBook.description,
                );
                expect(savedBooks[1].edition).toEqual(storedPaperBook.edition);
              });
            });

            describe('and the book to update has complete content', () => {
              it('updates the books', async () => {
                const newBook = paperBookFixture({ isbn: '1942788343' });
                const existingBook = paperBookFixture(
                  { title: 'New title' },
                  storedPaperBook.id,
                );
                const savedBooks = await bookRepository.saveAll([
                  newBook,
                  existingBook,
                ]);
                expect(savedBooks.length).toBe(2);
                expect(savedBooks[0].isbn).toEqual(newBook.isbn);
                expect(savedBooks[0].title).toEqual(newBook.title);
                expect(savedBooks[0].description).toEqual(newBook.description);
                expect(savedBooks[0].edition).toEqual(newBook.edition);
                expect(savedBooks[1].id).toEqual(existingBook.id);
                expect(savedBooks[1].isbn).toEqual(existingBook.isbn);
                expect(savedBooks[1].title).toEqual(existingBook.title);
                expect(savedBooks[1].description).toEqual(
                  existingBook.description,
                );
                expect(savedBooks[1].edition).toEqual(existingBook.edition);
              });
            });
          });
        });

        describe('and each book is of a different type', () => {
          describe('and some field values of one book are invalid', () => {
            it('throws an exception', async () => {
              const booksToStore = [
                bookFixture({ isbn: '1942788343' }),
                paperBookFixture({ isbn: undefined }, storedPaperBook.id),
              ];
              await expect(
                bookRepository.saveAll(booksToStore),
              ).rejects.toThrow(ValidationException);

              const storedBooks = await bookRepository.findAll();
              expect(storedBooks).toEqual([storedPaperBook]);
            });
          });

          describe('and all of the books specify valid field values', () => {
            describe('and the book to update has a partial content', () => {
              it('updates the books', async () => {
                const newBook = bookFixture({ isbn: '1942788343' });
                const existingBook = {
                  id: storedPaperBook.id,
                  title: 'New title',
                } as PartialEntityWithId<PaperBook>;
                const savedBooks: (Book | PaperBook)[] =
                  await bookRepository.saveAll([newBook, existingBook]);
                expect(savedBooks.length).toBe(2);
                expect(savedBooks[0].isbn).toEqual(newBook.isbn);
                expect(savedBooks[0].title).toEqual(newBook.title);
                expect(savedBooks[0].description).toEqual(newBook.description);
                expect(savedBooks[1].id).toEqual(existingBook.id);
                expect(savedBooks[1].isbn).toEqual(storedPaperBook.isbn);
                expect(savedBooks[1].title).toEqual(existingBook.title);
                expect(savedBooks[1].description).toEqual(
                  storedPaperBook.description,
                );
                expect((savedBooks[1] as PaperBook).edition).toEqual(
                  storedPaperBook.edition,
                );
              });
            });

            describe('and the book to update has a complete content', () => {
              it('updates the books', async () => {
                const newBook = bookFixture({ isbn: '1942788343' });
                const existingBook = paperBookFixture(
                  { title: 'New title' },
                  storedPaperBook.id,
                );
                const savedBooks: (Book | PaperBook)[] =
                  await bookRepository.saveAll([newBook, existingBook]);
                expect(savedBooks.length).toBe(2);
                expect(savedBooks[0].isbn).toEqual(newBook.isbn);
                expect(savedBooks[0].title).toEqual(newBook.title);
                expect(savedBooks[0].description).toEqual(newBook.description);
                expect(savedBooks[1].id).toEqual(existingBook.id);
                expect(savedBooks[1].isbn).toEqual(existingBook.isbn);
                expect(savedBooks[1].title).toEqual(existingBook.title);
                expect(savedBooks[1].description).toEqual(
                  existingBook.description,
                );
                expect((savedBooks[1] as PaperBook).edition).toEqual(
                  existingBook.edition,
                );
              });
            });
          });
        });
      });
    });

    afterEach(async () => {
      await deleteAll('books');
    });
  });

  describe('when deleting a list of books', () => {
    let storedBook: Book, storedPaperBook: PaperBook;

    beforeEach(async () => {
      const bookToStore = bookFixture({ isbn: '1942788342' });
      const storedBookId = await insert(bookToStore, 'books');
      storedBook = new Book({
        ...bookToStore,
        id: storedBookId,
      });

      const paperBookToStore = paperBookFixture({ isbn: '1942788343' });
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

    describe('that does not include any filter', () => {
      it('deletes all books', async () => {
        const deletedBooks = await bookRepository.deleteAll();
        expect(deletedBooks).toBe(2);

        const storedBooks = await bookRepository.findAll();
        expect(storedBooks.length).toBe(0);
      });
    });

    describe('that includes a null filter', () => {
      it('throws an exception', async () => {
        await expect(
          bookRepository.deleteAll({ filters: null as unknown as object }),
        ).rejects.toThrow(IllegalArgumentException);

        const storedBooks = await bookRepository.findAll();
        expect(storedBooks).toEqual([storedBook, storedPaperBook]);
      });
    });

    describe('that includes a filter matching no book', () => {
      it('does not delete any book', async () => {
        const deletedBooks = await bookRepository.deleteAll({
          filters: { hostingPlatforms: ['Audible'] },
        });
        expect(deletedBooks).toBe(0);

        const storedBooks = await bookRepository.findAll();
        expect(storedBooks).toEqual([storedBook, storedPaperBook]);
      });
    });

    describe('that includes a filter matching some books', () => {
      it('only deletes the matching books', async () => {
        const deletedBooks = await bookRepository.deleteAll({
          filters: { isbn: '1942788343' },
        });
        expect(deletedBooks).toBe(1);

        const storedBooks = await bookRepository.findAll();
        expect(storedBooks).toEqual([storedBook]);
      });
    });

    describe('that includes a filter matching all books', () => {
      it('deletes all books', async () => {
        const deletedBooks = await bookRepository.deleteAll({
          filters: { isbn: ['1942788342', '1942788343'] },
        });
        expect(deletedBooks).toBe(2);

        const storedBooks = await bookRepository.findAll();
        expect(storedBooks.length).toBe(0);
      });
    });

    afterEach(async () => {
      await deleteAll('books');
    });
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
