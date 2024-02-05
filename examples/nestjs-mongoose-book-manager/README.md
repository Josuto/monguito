This is an example of how to use `monguito` in a NestJS application that uses a MongoDB replica set instance with
a single node. It is a dummy book manager that exposes an endpoint for each CRUD operation offered by `monguito`.
A book may be of type `Book` or any of its subtypes i.e., `PaperBook` and `AudioBook`.

> [!WARNING]
> Some basic knowledge on [NestJS](https://docs.nestjs.com/) is assumed, as well as that you have read the main documentation of [monguito](../../README.md). The goal of this documentation is not to provide a comprehensive guide on `monguito` usage. Thus, you may want to check the [sample application code](./src) as you go reading.

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

## Run

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
export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  isDeleted: boolean;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    isDeleted?: boolean;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isDeleted = book.isDeleted ?? false;
  }

  markAsDeleted() {
    this.isDeleted = true;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
    isDeleted?: boolean;
  }) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    hostingPlatforms: string[];
    isDeleted?: boolean;
  }) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
```

`Entity` is an interface created to assist developers in the implementation of type-safe domain models. It specifies
an `id` field that all `Book` or subclass instances must include. This is because `id` is assumed to be the primary key
of any stored book. However, you do not need to implement `Entity` if you do not want to; simply make sure that your
superclass includes an `id` field in its definition.

## Book Repository

`MongooseBookRepository` is a Mongoose-based book repository implementation class. Since it does not include any
additional database operation, there is no need to create a custom repository interface for it. In this case, we can
directly implement the `TransactionalRepository` interface. The definition of `MongooseBookRepository` is as follows:

```typescript
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

  async deleteById(id: string): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    return this.entityModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec()
      .then((book) => !!book);
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
this field in its definition. You may find the full definition of the book domain model used by this sample application
[here](src/book.ts).

## Book Controller

This is a regular NestJS controller that specifies the main endpoints to interact with the book management app. Its
contents are as follows:

```typescript
type PartialBook = { id: string } & Partial<Book>;

function deserialiseAll<T extends Book>(plainBooks: any[]): T[] {
  const books: T[] = [];
  for (const plainBook of plainBooks) {
    books.push('id' in plainBook ? plainBook : deserialise(plainBook));
  }
  return books;
}

function deserialise<T extends Book>(plainBook: any): T {
  let book = null;
  if (plainBook.edition) {
    book = new PaperBook(plainBook);
  } else if (plainBook.hostingPlatforms) {
    book = new AudioBook(plainBook);
  } else {
    book = new Book(plainBook);
  }
  return book;
}

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

  @Patch()
  async update(
    @Body()
    book: PartialBook,
  ): Promise<Book> {
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

Moreover, you would probably not write a `deserialise` or `deserialiseAll` functions to enable the transformation of
JSON request bodies into domain objects when dealing with `POST` requests. Instead, you would rather use
a [NestJS pipe](https://docs.nestjs.com/pipes#pipes) to do so, thus properly implementing the Single Responsibility
principle. Once again, I wanted to share the simplest possible working example at the expense of not conveying to the
recommended practices in NestJS application construction. That being said, I would highly recommend you to
read [this section](https://docs.nestjs.com/pipes#class-validator) on how to use `class-validator`
and `class-transformer` for the validation and deserialisation of JSON request bodies in the development of complex
enterprise applications.

## Book Manager Module

NestJS implements the Dependency Inversion principle; developers specify their component dependencies and NestJS uses
its built-in dependency injector to inject those dependencies during component instantiation.

So, how do we specify the dependencies of the components that compose the book manager sample application? There are two
easy steps that we need to take: The first step consists of writing some decorators in the `MongooseBookRepository`
and `BookController` classes, as I already did in the code definition for both. The former class specifies that its
instances are `Injectable` to other components. It also specifies that to instantiate a book repository, NestJS needs to
inject a Mongoose connection. This is done with the `InjectConnection` decorator related to the `connection` constructor
input parameter.

On another hand, the definition of `BookController` specifies that, during instantiation, the controller consumes an
instance of a book `Repository` defined by the `BOOK_REPOSITORY` custom token. The definition of this custom token is
part of the second step: writing the last required class `AppModule`. The definition of this class is as follows:

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

This class module specifies the Mongoose connection required to instantiate `MongooseBookRepository` at the `imports`
property of the `Module` decorator. It also determines that any component dependent on a provider identified by
the `BOOK_REPOSITORY` custom token is to get an instance of `MongooseBookRepository`. Finally, it determines
that `BookController` is the sole controller for the book manager application.

# Custom Repository Validation

This application comes with a couple of unit tests that you may find useful when validating your own NestJS application.
The first test suite validates the [basic CRUD operations](../../README.md/#basic-crud-operations) included in `BookController` and is encoded in the [book.controller.test.ts](./test/book.controller.test.ts) file. The second test suite validates the [transactional CRUD operations](../../README.md/#transactional-crud-operations) also written in `BookController` and is implemented on [book.transactional-controller.test.ts](./test/book.transactional-controller.test.ts).

As mentioned in `monguito`'s main documentation, basic CRUD operations may run on a MongoDB standalone instance. However, transactional CRUD operations can only run on a MongoDB cluster such as replica set. Therefore, the nature of basic and transactional CRUD operations determines the configuration of the aforementioned test suites: [book.controller.test.ts](./test/book.controller.test.ts) works with an in-memory version of standalone MongoDB, whereas [book.transactional-controller.test.ts](./test/book.transactional-controller.test.ts) operates over an in-memory version of MongoDB replica set.

Let's now focus on the module configuration and application initialisation for these test files. Keep in mind that, in both cases, you first need to create a testing module for your app.

## Initialisation of MongoDB Standalone-based App

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

You may want to create an instance of `MongoMemoryServer` (the main class exported by the library [`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server)) instead of a full-blown MongoDB standalone instance. This instance is required to inject the custom repository at `BookController` at test runtime. The creation of the instance is done at the `rootMongooseStandaloneMongoTestModule` function included at [`mongo-server.ts`](../../test/util/mongo-server.ts). This is its implementation:

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

You may want to create an instance of `MongoMemoryReplSet` (also defined in the library [`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server)) instead of a full-blown MongoDB replica set instance. This instance is required to inject the custom repository at `BookController` at test runtime. The creation of the instance is done at the `rootMongooseReplicaSetMongoTestModule` function included at [`mongo-server.ts`](../../test/util/mongo-server.ts). This is its implementation:

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
