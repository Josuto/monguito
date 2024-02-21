This is an example of how to use `monguito` in a NestJS application that uses a MongoDB replica set instance with
a single node. The application models a dummy book manager that exposes an endpoint for each CRUD operation offered by `monguito`.
A book may be of type `Book` or any of its subtypes i.e., `PaperBook` and `AudioBook`.

> [!WARNING]
> Some basic knowledge on [NestJS](https://docs.nestjs.com/) and [monguito](../../README.md) is assumed. The goal of this documentation is not to provide a comprehensive guide on `monguito` usage; you may want to check the [sample application code](./src) as you go reading.

# Main Contents

- [Installing and Running the Example Application](#installing-and-running-the-example-application)
- [Bottom-up Book Manager Application Implementation](#bottom-up-book-manager-application-implementation)
- [Custom Repository Validation](#custom-repository-validation)

# Installing and Running the Example Application

## Installation

Assuming that you have already [installed NestJS](https://docs.nestjs.com/first-steps) in your local machine, first you
need to install of the project dependencies by running the following command:

```bash
$ yarn install
```

## Execution

The application requires a running instance of MongoDB. It includes a `docker-compose.yml` file that will fire up a
MongoDB replica set instance, assuming that Docker Desktop is running.

```bash
# run the NestJS application as well as the MongoDB Docker container
$ yarn start:dev

# run the NestJS application with no MongoDB Docker container
$ yarn start
```

# Bottom-up Book Manager Application Implementation

## Book Model

The application domain model is pretty simple: `Book` is a supertype that specifies two subclasses i.e., `PaperBook`
and `AudioBook`. Here is its definition:

```typescript
type AuditableBookType = Book & Auditable;

export class Book extends AuditableClass implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  isDeleted?: boolean;

  constructor(book: AuditableBookType) {
    super(book);
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isDeleted = book.isDeleted ?? false;
  }
}

type AuditablePaperBookType = PaperBook & Auditable;

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: AuditablePaperBookType) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

type AuditableAudioBookType = AudioBook & Auditable;

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];

  constructor(audioBook: AuditableAudioBookType) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
```

`Entity` is an interface created to assist developers in the implementation of type-safe domain models. You can find further details on `Entity` in [this section](../../README.md/#the-entity-interface) of `monguito` documentation.

Moreover, by extending `AuditableClass`, the book domain model enables `monguito`'s audit capabilities. This topic is fully covered in [this other section](../../README.md/#built-in-audit-data-support) of the main documentation.

## Book Repository

`MongooseBookRepository` is a Mongoose-based book repository implementation class. Since it does not include any
additional database operation, there is no need to create a custom repository interface for it. In this case, we can
directly implement the `TransactionalRepository` interface. The definition of `MongooseBookRepository` is as follows:

```typescript
type SoftDeleteAllOptions = DeleteAllOptions & AuditOptions;
type SoftDeleteByIdOptions = DeleteByIdOptions & AuditOptions;

@Injectable()
export class MongooseBookRepository
  extends MongooseTransactionalRepository<Book>
  implements TransactionalRepository<Book>
{
  constructor(@InjectConnection() connection: Connection) {
    super(
      {
        Default: { type: Book, schema: BookSchema },
        PaperBook: { type: PaperBook, schema: PaperBookSchema },
        AudioBook: { type: AudioBook, schema: AudioBookSchema },
      },
      connection,
    );
  }

  async deleteById(
    id: string,
    options?: SoftDeleteByIdOptions,
  ): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    return this.entityModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .session(options?.session)
      .exec()
      .then((book) => !!book);
  }

  async deleteAll(options?: SoftDeleteAllOptions): Promise<number> {
    if (options?.filters === null) {
      throw new IllegalArgumentException('The given filters must be valid');
    }
    return await runInTransaction(
      async (session: ClientSession) => {
        const books = await this.findAll({
          filters: options?.filters,
          session,
        });
        const booksToDelete = books.map((book) => {
          book.isDeleted = true;
          return book;
        });
        const deletedBooks = await this.saveAll(booksToDelete, { session });
        return deletedBooks.length;
      },
      { ...options, connection: this.connection },
    );
  }
}
```

`InjectConnection` is a decorator required to inject a Mongoose connection to a MongoDB database; You may choose to
store all of your entities in collections of the same database or different databases. If you decide to use multiple
databases, you may need to specify a NestJS provider for each of them. NestJS providers are discussed later in this
document.

This implementation of `MongooseBookRepository` overrides the `deleteById` operation defined at `MongooseRepository`
(i.e., `MongooseTransactionalRepository`'s extension), also modifying its semantics; while `MongooseRepository.deleteById()`
performs hard book deletion, `MongooseBookRepository.deleteById()` performs soft book deletion. You may realise that
this operation updates the value of the book field `isDeleted` to `true`. In order to achieve it, `Book` must include
this field in its definition.

Besides, this soft deletion version `deleteById` supports audit of deleted books. This is achieved by augmenting `DeleteAllOptions` (i.e., the original type for `deleteById` options) with `AuditOptions`. This way, clients of the operation can specify who is requesting its execution via the `options.userId` input parameter. This is precisely how you can extend any operation `options` type with any extra property of your liking.

Similarly, `MongooseBookRepository` overrides the `deleteAll` operation to perform soft deletion of all the entities that match the value of the optional `filters` property specified at the `options` input parameter. As with `deleteById`, the soft deletion version of `deleteAll` also supports audit of deleted books. Finally, you may notice that the logic of this operation is wrapped as a callback function sent to `runInTransaction` as input parameter to guarantee its atomicity. Please visit [this section](../../README.md/#create-your-custom-transactional-operations) of the main documentation for further details on `runInTransaction`.

## Book Controller

This is a regular NestJS controller that specifies the main endpoints to interact with the book management app. Its
contents are as follows:

```typescript
type PartialBook = { id: string } & Partial<Book>;

@Controller('books')
export class BookController {
  constructor(
    @Inject('BOOK_REPOSITORY')
    private readonly bookRepository: TransactionalRepository<Book>,
  ) {}

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookRepository.findAll();
  }

  @Post()
  async insert(
    @Body({
      transform: (plainBook) => deserialise(plainBook),
    })
    book: Book,
  ): Promise<Book> {
    return this.save(book);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() book: PartialBook,
  ): Promise<Book> {
    book.id = id;
    return this.save(book);
  }

  @Post('/all')
  async saveAll(
    @Body({
      transform: (plainBooks) => deserialiseAll(plainBooks),
    })
    books: (Book | PartialBook)[],
  ): Promise<Book[]> {
    try {
      return await this.bookRepository.saveAll(books);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Delete(':id')
  async deleteById(@Param('id') id: string): Promise<boolean> {
    return this.bookRepository.deleteById(id);
  }

  @Delete()
  async deleteAll(): Promise<number> {
    return this.bookRepository.deleteAll();
  }

  private async save(book: Book | PartialBook): Promise<Book> {
    try {
      return await this.bookRepository.save(book);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
```

You may argue several things here. For example, you may think that an enterprise application may delegate
business/domain logic to a layer of service objects as described in
e.g., [Domain-Driven Design (tactical design)](https://enterprisecraftsmanship.com/posts/domain-vs-application-services/).
I have decided not to do so for simplicity purposes; the book manager presented here is such an extremely
simple CRUD application that introducing services would be over-engineering. I rather implement the minimum amount of
code necessary for the sake of maximising the actual purpose of this documentation: illustrate how to integrate
`monguito` on a NodeJS-based enterprise application.

The functions `deserialise` and `deserialiseAll` deserialise books in JSON format into actual instances of type `Book` or any of its subtypes. I am not showing its code as it does not bring too much value here. Moreover, you would probably not write them; instead, you would rather use a [NestJS pipe](https://docs.nestjs.com/pipes#pipes) to perform book deserialisation, thus properly implementing the Single Responsibility principle. I wanted to share the simplest possible working example at the expense of not conveying to the recommended practices in NestJS application construction. That being said, I would highly recommend you to read [this section](https://docs.nestjs.com/pipes#class-validator) on how to use `class-validator` and `class-transformer` for the validation and deserialisation of JSON request bodies in the development of complex enterprise applications.

## Book Manager Module

NestJS implements the Dependency Inversion principle; developers specify their component dependencies and NestJS uses
its built-in dependency injector to inject those dependencies during component instantiation.

Book manager application component injection is defined at `AppModule`. First, it describes a Mongoose connection to a MongoDB replica set instance as a dynamic module `import` that is to be injected to an instance of `MongooseBookRepository`, as showed earlier at that class' constructor. Moreover, `MongooseBookRepository` is a `provider` to be injected to the `BookController`. The custom token specified both at the controller `bookRepository` constructor parameter and the `provider` (i.e., `BOOK_REPOSITORY`) must match. Finally, `AppModule` determines `BookController` as the sole controller of the application.

Here is the definition of `AppModule`:

```typescript
@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27016/book-repository', {
      directConnection: true,
      replicaSet: 'rs0',
    }),
  ],
  providers: [
    {
      provide: 'BOOK_REPOSITORY',
      useClass: MongooseBookRepository,
    },
  ],
  controllers: [BookController],
})
export class AppModule {}
```

# Custom Repository Validation

This application comes with a couple of unit tests that you may find useful when creating the tests of your own NestJS application.
The first test suite validates the [basic CRUD operations](../../README.md/#basic-crud-operations) included in `BookController` and is encoded at [book.controller.test.ts](./test/book.controller.test.ts). The second test suite validates the [transactional CRUD operations](../../README.md/#transactional-crud-operations) also written in `BookController` and is implemented in [book.transactional-controller.test.ts](./test/book.transactional-controller.test.ts).

As mentioned in `monguito`'s [main documentation](../../README.md), basic CRUD operations may run on a standalone MongoDB instance. However, transactional CRUD operations can only run on a MongoDB cluster such as replica set. Therefore, the nature of basic and transactional CRUD operations determines the configuration of the aforementioned test suites: [book.controller.test.ts](./test/book.controller.test.ts) works with an in-memory standalone MongoDB instance, whereas [book.transactional-controller.test.ts](./test/book.transactional-controller.test.ts) operates over an in-memory MongoDB replica set instance.

Let's now focus on the module configuration and application initialisation for these test files. Keep in mind that, in both cases, you first need to create a testing module for your app.

## Initialisation of Standalone MongoDB-based App

Here is how you initialise the test application required to run the tests described at [book.controller.test.ts](./test/book.controller.test.ts):

```typescript
let bookManager: INestApplication;

beforeAll(async () => {
  const appModule = await Test.createTestingModule({
    imports: [rootMongooseStandaloneMongoTestModule(), AppModule],
  }).compile();

  await setupConnection();

  bookManager = appModule.createNestApplication();
  await bookManager.init();
}, timeout);
```

`MongoMemoryServer` models an in-memory standalone MongoDB instance, pretty handy to substitute a full-blown MongoDB instance during validation. This class is part of the [`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server) used on the book manager application. The creation of the instance is done at the `rootMongooseStandaloneMongoTestModule` function included at [`mongo-server.ts`](../../test/util/mongo-server.ts):

```typescript
const dbName = 'test';
let mongoServer: MongoMemoryServer;

export const rootMongooseStandaloneMongoTestModule = (
  options: MongooseModuleOptions = {},
) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName, port: 27017 },
      });
      const mongoUri = mongoServer.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });
```

## Initialisation of MongoDB Replica Set-based App

Here is how you initialise the test application required to run the tests described at [book.transactional-controller.test.ts](./test/book.transactional-controller.test.ts):

```typescript
let bookManager: INestApplication;

beforeAll(async () => {
  const appModule = await Test.createTestingModule({
    imports: [rootMongooseReplicaSetMongoTestModule(), AppModule],
  }).compile();

  await setupConnection();

  bookManager = appModule.createNestApplication();
  await bookManager.init();
}, timeout);
```

You may want to create an in-memory instance of MongoDB replica set, modelled by `MongoMemoryReplSet` (also included at [`mongodb-memory-server`](https://www.npmjs.com/package/mongodb-memory-server)), instead of a full-blown instance. The creation of the instance is done at the `rootMongooseReplicaSetMongoTestModule` function included at [`mongo-server.ts`](../../test/util/mongo-server.ts):

```typescript
const dbName = 'test';
let mongoServer: MongoMemoryServer;

export const rootMongooseReplicaSetMongoTestModule = (
  options: MongooseModuleOptions = {},
) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryReplSet.create({
        instanceOpts: [{ port: 27016 }],
        replSet: { name: 'rs0', dbName, count: 1 },
      });
      const mongoUri = mongoServer.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });
```

## Connection Setup

You may have appreciated the invocation of `setupConnection` before the initialisation of both testing applications. This function tells Mongoose to connect to the pertaining MongoDB instance (standalone or replica set). You may find the details of this function as well as some other validation helper functions at [`mongo-server.ts`](../../test/util/mongo-server.ts).

## Run the Tests

```shell
# install the dependencies and run tests
$ yarn install & yarn test

# install the dependencies and run tests with coverage
$ yarn install & yarn test:cov
```
