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
- [Custom Repository Testing Configuration](#custom-repository-testing-configuration)

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

  async create(createBookDto: CreateBookDto): Promise<Book> {
    return this.bookRepository.save(createBookDto.toBook());
  }

  async update(updateBookDto: UpdateBookDto): Promise<Book> {
    return this.bookRepository.save(updateBookDto);
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
  async create(
    @Body({
      transform: (plainBook) => deserialiseBookDto(plainBook),
    })
      createBookDto: CreateBookDto,
  ): Promise<Book> {
    return this.bookService.create(createBookDto);
  }

  @Patch('/:bookId')
  async update(
    @Param('bookId') bookId: string,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<Book> {
    return this.bookService.update(updateBookDto);
  }

  @Get()
  async findAll(): Promise<Book[]> {
    return this.bookService.findAll();
  }
}
```

The function `deserialiseBookDto` is a simple factory method that transforms any given object to an instance of
type `CreateBookDto` or any of its subtypes based on the existence of certain property in the given object.

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

# Custom Repository Testing Configuration

This is a pretty canonical NestJS application. It is so simple that comes with no testing logic for its implementation.
However, if you ever need to perform NestJS-based custom repository validation, you may want to hear about this.

First of all, in order to create a custom repository to test or to be used in the test of another application component,
you are going to need to create a NestJS testing module for it. Here is a way you can follow to do so. Say we want to
create a book repository:

```typescript
let bookRepository: BookRepository;

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      rootMongooseTestModule(),
    ],
    providers: [MongooseBookRepository],
  }).compile();

  bookRepository = module.get<BookRepository>(MongooseBookRepository);
});
```

You may want to read [this section](../../README.md#write-your-own-repository-interfaces) of
the `node-abstract-repository` main documentation for further details on the `BookRepository` interface.

Moreover, you may want to use
the [`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server) to validate your
custom repository. You may realise that the first import specified in the previous code sample invokes the
function `rootMongooseTestModule()`. We would recommend that you create such a function under some utility test file
such as [mongo-server.ts](../../test/util/mongo-server.ts). This is its implementation:

```typescript
let mongoServer: MongoMemoryServer;

export const rootMongooseTestModule = (options: MongooseModuleOptions = {}) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'test',
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

You can then use the `mongoServer` instance to perform several explicit Mongoose-based DB operations such as those
specified at [mongo-server.ts](../../test/util/mongo-server.ts).
