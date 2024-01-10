import { TransactionalRepository } from '../../src/transactional-repository';
import { IllegalArgumentException } from '../../src/util/exceptions';
import { Book } from '../domain/book';
import {
  bookFixture,
  electronicBookFixture,
  paperBookFixture,
} from '../domain/book.fixtures';
import {
  closeMongoConnection,
  deleteAll,
  findOne,
  setupConnection,
} from '../util/mongo-server';
import { MongooseBookTransactionalRepository } from './book.transactional-repository';

describe('Given an instance of book repository', () => {
  let bookRepository: TransactionalRepository<Book>;

  beforeAll(async () => {
    await setupConnection();
    bookRepository = new MongooseBookTransactionalRepository();

    // FIXME: the following line is oddly required to ensure the right operation of transactions. Figure out what is wrong with the current replica set setup logic.
    await findOne({}, 'books');
  });

  describe('when saving a list of books', () => {
    describe('that is empty', () => {
      it('then returns an empty list of books', async () => {
        const books = await bookRepository.saveAll([]);

        expect(books).toEqual([]);
      });
    });

    describe('that includes a book that has not been registered as a Mongoose discriminator', () => {
      it('throws an exception', async () => {
        const booksToInsert = [
          bookFixture({ isbn: '1942788340' }),
          electronicBookFixture({ isbn: '1942788341' }),
        ];
        await expect(
          bookRepository.saveAll(booksToInsert),
        ).rejects.toThrowError(IllegalArgumentException);
        expect(await findOne({}, 'books')).toBeNull();
      });
    });

    describe('that includes books that have been registered as a Mongoose discriminator', () => {
      // describe('and one book is undefined', () => {
      //   it('throws an exception', async () => {});
      // });

      // describe('and one book is null', () => {
      //   it('throws an exception', async () => {});
      // });

      describe('and all books are new', () => {
        // describe('and all books are of the same type', () => {
        //   describe('and some field values of one book are invalid', () => {
        //     it('throws an exception', async () => {});
        //   });

        //   describe('and all books specify valid field values', () => {});
        // });

        describe('and each book is of a different type', () => {
          // describe('and some field values of one book are invalid', () => {
          //   it('throws an exception', async () => {});
          // });

          describe('and all books specify valid field values', () => {
            afterEach(async () => {
              await deleteAll('books');
            });

            it('then inserts the books', async () => {
              const booksToInsert = [
                bookFixture({ isbn: '1942788342' }),
                paperBookFixture({ isbn: '1942788343' }),
              ];
              const savedBooks = await bookRepository.saveAll(booksToInsert);
              expect(savedBooks.length).toBe(2);
            });
          });
        });
      });

      // describe('and none of the books is new', () => {
      //   describe('and all books are of the same type', () => {
      //     describe('and some field values of one book are invalid', () => {
      //       it('throws an exception', async () => {});
      //     });

      //     describe('and all books specify valid field values', () => {});
      //   });

      //   describe('and each book is of a different type', () => {
      //     describe('and some field values of one book are invalid', () => {
      //       it('throws an exception', async () => {});
      //     });

      //     describe('and all books specify valid field values', () => {});
      //   });
      // });

      // describe('and one book is new while another is not new', () => {
      //   describe('and all books are of the same type', () => {
      //     describe('and some field values of one book are invalid', () => {
      //       it('throws an exception', async () => {});
      //     });

      //     describe('and all books specify valid field values', () => {
      //       describe('and the book to insert has a partial content', () => {
      //         it('throws an exception', async () => {});
      //       });

      //       describe('and the book to insert has a complete content', () => {
      //         describe('and the book to update has a partial content', () => {});

      //         describe('and the book to update has a complete content', () => {});
      //       });
      //     });
      //   });

      //   describe('and each book is of a different type', () => {
      //     describe('and some field values of one book are invalid', () => {
      //       it('throws an exception', async () => {});
      //     });

      //     describe('and all books specify valid field values', () => {
      //       describe('and the book to insert has a partial content', () => {
      //         it('throws an exception', async () => {});
      //       });

      //       describe('and the book to insert has a complete content', () => {
      //         describe('and the book to update has a partial content', () => {});

      //         describe('and the book to update has a complete content', () => {});
      //       });
      //     });
      //   });
      // });
    });
  });

  afterAll(async () => {
    await closeMongoConnection();
  });
});
