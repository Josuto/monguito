This is an example of how to use the `node-abstract-repository` library in a NestJS application that uses MongoDB. It
is a dummy book manager that exposes three simple endpoints i.e., create a book, update a book, and list all books.
A book may be of type `Book` or any of its subtypes i.e., `PaperBook` and `AudioBook`.

> **Warning**
>
> Some basic knowledge on [NestJS](https://docs.nestjs.com/) is assumed, as well as that you have read the main
> documentation of [node-abstract-repository](../../README.md). The goal of this documentation is not to provide a
> comprehensive guide on the `node-abstract-repository` library usage. Thus, you may want to check the [code of the
> example](./src) as you go reading.

# Main Contents

- [Installing and Running the Example Application](#installing-and-running-the-example-application)
- [Bottom-up Book Manager Application Implementation](#bottom-up-book-manager-application-implementation)
- [Custom Repository Validation](#custom-repository-validation)

# Installing and Running the Example Application

## Installation

```bash
$ yarn install
```

## Run

The application requires a running instance of MongoDB. It includes a `docker-compose.yml` file that will fire up a
MongoDB instance, assuming that Docker Desktop is running.

```bash
# run the NestJS application as well as the MongoDB Docker container
$ yarn start:dev

# run the NestJS application with no MongoDB Docker container
$ yarn start 
```

# Bottom-up Book Manager Application Implementation

## Book Repository

`MongooseBookRepository` is a Mongoose-based book repository implementation class. Since it does not include any
additional database operation, there is no need to create a custom repository interface for it. In this case, we can
directly implement the `Repository` interface. The definition of `MongooseBookRepository` is as follows:

```typescript
@Injectable()
export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements Repository<Book> {
  constructor(@InjectConnection() connection: Connection) {
    super(
      {
        Default: {type: Book, schema: BookSchema},
        PaperBook: {type: PaperBook, schema: PaperBookSchema},
        AudioBook: {type: AudioBook, schema: AudioBookSchema},
      },
      connection,
    );
  }
}
```

`@InjectConnection` is a `@nestjs/mongoose` decorator required to inject a Mongoose connection to a MongoDB database;
You may choose to store all of your entities in collections of the same database or different databases. If you decide
to use multiple databases, you may need to specify a NestJS provider for each of them.

## Book Service

The class `BookService` shows how to inject an instance of `Repository<Book>` in an application service:

```typescript
@Injectable()
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY')
    private readonly bookRepository: Repository<Book>,
  ) {
  }

  async save(book: PersistentBook): Promise<Book> {
    if (book) {
      try {
        return await this.bookRepository.save(book);
      } catch (error) {
      }
    }
    return null as unknown as Book;
  }

  async findAll(): Promise<Book[]> {
    return this.bookRepository.findAll();
  }
}
```

The less obvious details on this application service definition are that (1) the `BookService` is a NodeJS provider
(i.e., a dependency) that is `injectable` by any other higher-level component in the application layer structure and
that (2) an instance of book `Repository` is a provider for `BookService`. `BOOK_REPOSITORY` is a NestJS custom token to
enable the framework's dependency injector to actually `inject` an implementation of book `Repository` to the
application service. Let's now see how to define which class is to implement book `Repository` in this case.

## Book Module

The `BookModule` class specifies several elements required to put all the book management logic under the same
application domain. Here is its definition:

```typescript
@Module({
  providers: [
    {
      provide: 'BOOK_REPOSITORY',
      useClass: MongooseBookRepository,
    },
    BookService,
  ],
  controllers: [BookController],
})
export class BookModule {
}
```

The implementation of such the instance of `Repository<Book>` is given by `MongooseBookRepository`, as specified by the
provider identified with the `BOOK_REPOSITORY` custom token.

Next, let's see the implementation of the controller specified at the `BookModule` class.

## Book Controller

This is a regular NestJS controller that specifies the main endpoints to interact with the book management app. Its
contents are as follows:

```typescript
@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {
  }

  @Post()
  async insert(
    @Body({
      transform: (plainBook) => deserialiseBook(plainBook),
    })
      book: Book,
  ): Promise<Book> {
    const createdBook = await this.bookService.save(book);
    if (createdBook) return createdBook;
    throw new BadRequestException();
  }

  @Patch()
  async update(
    @Body()
      book: { id: string } & Partial<Book>,
  ): Promise<Book> {
    const updatedBook = await this.bookService.save(book);
    if (updatedBook) return updatedBook;
    throw new BadRequestException();
  }

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookService.findAll();
  }
}
```

The function `deserialiseBook` is a simple factory method that transforms any given object to an instance of type `Book`
or any of its subtypes based on the existence of certain property in the given object.

## NestJS Root Module Configuration

Finally, all NestJS applications must specify a root module. This project defines it at the `app.module.ts` file. Here
is the code:

```typescript
@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27016/book-repository'),
    BookModule,
  ],
})
export class AppModule {
}
```

The module specified here imports two modules: `BookModule`, that incorporates the book management feature logic, and
a dynamic module once more brought by the `MongooseModule.forRoot()`, required by `MongooseBookRepository` to obtain the
aforementioned Mongoose connection object.

# Custom Repository Validation

This application comes with some e2e tests that you may find useful when validating your own NestJS application. You may
find the whole test infrastructure [here](./test/book.controller.test.ts).

First of all, you need to create a testing module for your app. Here is a way you can follow to do so:

```typescript
let bookManager: INestApplication;

beforeAll(async () => {
  const appModule = await Test.createTestingModule({
    imports: [rootMongooseTestModule(), AppModule],
  }).compile();

  bookManager = appModule.createNestApplication();
  await bookManager.init();
});
```

You may want to create an instance of `MongoMemoryServer` (the main class exported by the library
[`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server)) instead of a
full-blown MongoDB instance. This instance is vital to inject the custom repository at `BookService` at test runtime.
The creation of the instance is defined by the `rootMongooseTestModule` function included
at [`mongo-server.ts`](../../test/util/mongo-server.ts). This is its implementation:

```typescript
let mongoServer: MongoMemoryServer;

export const rootMongooseTestModule = (
  options: MongooseModuleOptions = {},
  port = 27016,
  dbName = 'book-repository',
) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          port,
          dbName: dbName,
        },
      });
      const mongoUri = mongoServer.getUri();
      return {
        uri: mongoUri,
        ...options,
      };
    },
  });
```

You may perceive that the port and dbName input parameters match those of the database connection
specified [earlier](#nestjs-root-module-configuration). This is no coincidence.

Finally, you can then use the `mongoServer` instance to perform several explicit Mongoose-based DB operations such as
those specified at [mongo-server.ts](../../test/util/mongo-server.ts).

## Run the Tests

```shell
# install the dependencies and run tests
$ yarn install & yarn test

# install the dependencies and run tests with coverage
$ yarn install & yarn test:cov
```
