This is an example of how to use the `node-abstract-repository` library in a NestJS application that uses MongoDB. It
is a dummy book manager that exposes three simple endpoints i.e., create, update, and delete a book, as well as list all
books. A book may be of type `Book` or any of its subtypes i.e., `PaperBook` and `AudioBook`.

> **Warning**
>
> Some basic knowledge on [NestJS](https://docs.nestjs.com/) is assumed, as well as that you have read the main
> documentation of [node-abstract-repository](../../README.md). The goal of this documentation is not to provide a
> comprehensive guide on the `node-abstract-repository` library usage. Thus, you may want to check
> the [sample application code](./src) as you go reading.

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
MongoDB instance, assuming that Docker Desktop is running.

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

  async deleteById(id: string): Promise<boolean> {
    if (!id) throw new IllegalArgumentException('The given ID must be valid');
    return this.entityModel
      .findByIdAndUpdate(id, {isDeleted: true}, {new: true})
      .exec()
      .then((book) => !!book);
  }
}
```

`InjectConnection` is a decorator required to inject a Mongoose connection to a MongoDB database; You may choose to
store all of your entities in collections of the same database or different databases. If you decide to use multiple
databases, you may need to specify a NestJS provider for each of them. NestJS providers are discussed later in this
document.

This implementation of `MongooseBookRepository` overrides the `deleteById` operation defined at `MongooseRepository`,
also modifying its semantics; while `MongooseRepository.deleteById()` performs hard book
deletion, `MongooseBookRepository.deleteById()` performs soft book deletion. You may realise that this operation updates
the value of the book field `isDeleted` to `true`. In order to achieve it, `Book` must include this field in its
definition. You may find the full definition of the book domain model used by this sample
application [here](src/book.ts).

## Book Controller

This is a regular NestJS controller that specifies the main endpoints to interact with the book management app. Its
contents are as follows:

```typescript
type PartialBook = { id: string } & Partial<Book>;

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
    private readonly bookRepository: Repository<Book>,
  ) {
  }

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

  @Delete(':id')
  async deleteById(@Param('id') id: string): Promise<boolean> {
    return this.bookRepository.deleteById(id);
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
the `node-abstract-repository` library on a NodeJS-based enterprise application.

Moreover, you would probably not write a `deserialise` function to enable the transformation of JSON request bodies into
domain objects when dealing with `POST` requests. Instead, you would rather use
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
    MongooseModule.forRoot('mongodb://localhost:27016/book-repository'),
  ],
  providers: [
    {
      provide: 'BOOK_REPOSITORY',
      useClass: MongooseBookRepository,
    },
  ],
  controllers: [BookController],
})
export class AppModule {
}
```

This class module specifies the Mongoose connection required to instantiate `MongooseBookRepository` at the `imports`
property of the `Module` decorator. It also determines that any component dependent on a provider identified by
the `BOOK_REPOSITORY` custom token is to get an instance of `MongooseBookRepository`. Finally, it determines
that `BookController` is the sole controller for the book manager application.

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
full-blown MongoDB instance. This instance is vital to inject the custom repository at `BookController` at test runtime.
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
specified [earlier](#book-manager-module). This is no coincidence.

Finally, you can then use the `mongoServer` instance to perform several explicit Mongoose-based DB operations such as
those specified at [mongo-server.ts](../../test/util/mongo-server.ts).

## Run the Tests

```shell
# install the dependencies and run tests
$ yarn install & yarn test

# install the dependencies and run tests with coverage
$ yarn install & yarn test:cov
```
