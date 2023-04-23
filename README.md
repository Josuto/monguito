The goal of this project is help [NestJS](https://github.com/nestjs/nest) developers to focus on writing custom database
access operations in a fast, easy, and structured manner, thus allowing them to properly decouple domain and persistence
logic.

__TL;DR__: To directly see a working example, you jump directly to the [Cut to the Chase](#cut-to-the-chase) section,
although I would recommend you to later come back to the introductory section.

# Abstract and Polymorphic Repository

This project is a lightweight implementation of
the [Repository](https://www.martinfowler.com/eaaCatalog/repository.html) pattern for NestJS, currently focused
on [MongoDB](https://www.mongodb.com/). Its main component is the generic `Repository` interface, which defines the most
basic database technology-agnostic CRUD operations. Here is the current definition of this interface:

```typescript
export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>() => Promise<S[]>;
  save: <S extends T>(element: S | ({ id: string } & Partial<S>)) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
```

Inspired in the _Entity_ concept
from [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), `Entity` is an interface that is to be
implemented by any domain object to persist in a database. Interfaces are non-intrusive data structures that allow
developers to specify inheritance relations between domain objects of their interest. `Entity` defines an `id` field
that all domain objects must define. `T` generically refers to a domain object type that implements `Entity`, and `S`
generically refers to a subtype of such a domain object type. This is to enable data access operations over
subtyping-based [polymorphic](https://www.mongodb.com/developer/products/mongodb/polymorphic-pattern/) data structures.
An example of a polymorphic data structure is a `Book` class that is a supertype for a `PaperBook` and `AudioBook`
subclasses. Following the example, a key benefit of this approach is any client of `Repository` or any custom repository
build on top of it is able to store and retrieve book instances of the expected type e.g., the result of `findAll` could
be a mix of instances of `Book`, `PaperBook`, and `AudioBook`.

The magic of the polymorphism actually happens at `MongooseRepository`, a [Mongoose](https://mongoosejs.com/)-based
_abstract_ repository class that implements `Repository`. `MongooseRepository` is a generic template that custom domain
object-specific repository classes can extend from, thus releasing developers from having to write boilerplate code
for the operations specified at `Repository`. This way, developers can benefit from the already implemented MongoDB CRUD
operations logic and focus on writing the repository logic pertaining to their own domain.

An important feature of this abstract repository approach is that all the `find` methods return an `Optional` of a given
domain object type instead of objects of a type defined by the underlying ORM/ODM or database driver (e.g., `Document`
in the case of Mongoose). Similarly, the `save` operation returns an instance of the given domain object type. This way
no database logic is leaked into the corresponding domain model, as advised
in [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Furthermore, it
saves developers from having to instantiate domain objects from the outcomes of the data access operations and enables
them to directly execute any domain logic they may specify.

The current implementation of the Mongoose-based MongoDB abstract repository has been fully validated in
the `book.repository.test.ts` file.

# Cut to the Chase

You can find the implementation of the polymorphic and abstract repository infrastructure under `src/repository`. All
the code related to the examples explained at this section is located under `src/book`. The `src/main.ts`
and `src/app.module.ts` are also required to execute the NestJS application example.

## Custom Repository Implementation Example

`BookRepository` is an interface that extends `Repository` with a data access operation required in the domain of `Book`
handling. Here is the definition for `BookRepository`:

```typescript
export interface BookRepository extends Repository<Book> {
  findByTitle: <T extends Book>(title: string) => Promise<T[]>;
}
```

`MongooseBookRepository` is a custom repository implementation class for the domain object `Book` that
extends `MongooseRepository` and implements `BookRepository`. Here is the definition for `MongooseBookRepository`:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository {
  constructor(
    @InjectModel(Book.name)
    private readonly bookModel: Model<Book>,
  ) {
    super(bookModel, {Default: Book, Paper: PaperBook, Audio: AudioBook});
  }

  async findByTitle<T extends Book>(title: string): Promise<T[]> {
    return this.bookModel
      .find({title: title})
      .exec()
      .then((books) => books.map((book) => this.instantiateFrom(book)));
  }
}
```

The constructor of the class invokes that of `MongooseRepository` with a map that specifies all the book supertype and
subtypes (i.e., the domain object type hierarchy) to be handled by the custom repository. This implementation detail is
required to enable repository persistence and retrieval methods to retrieve instances of the pertaining (sub)type
of `Book`. `MongooseRepository` exposes the protected method `instantiateFrom` in charge of performing such
instantiation. This implementation detail may feel verbose, but it is required since JavaScript does not provide any
reflection API to enable the repository data access operations to instantiate persisted objects to their correct domain
types. Some future remediation could consist of registering such a map of domain object hierarchy somewhere more
suitable e.g., as part of the `BookModule` imports.

Finally, the `Default` type is always meant to be the domain object supertype i.e., `Book` in the example above.

## NestJS Application Example

This project includes a dummy NestJS application that invokes several CRUD operations defined at `BookRepository`. I am
not getting into the implementation details for the controller and service classes, but you can find them at the source
code i.e., `src/book/book.controller.ts` and `src/book/book.service.ts`, respectively.

Let's go to the interesting bits: here is the definition of `BookModule`:

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Book.name,
        schema: BookSchema,
        discriminators: [
          {name: 'Paper', schema: PaperBookSchema},
          {name: 'Audio', schema: AudioBookSchema},
        ],
      },
    ]),
  ],
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

### Repository Injection

An interesting detail from `BookModule` is that it specifies a provider instantiated using the `MongooseBookRepository`
class. However, we should _depend on abstractions, not
implementations_ ([Dependency Inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)).
Hence, this provider can be injected in a service component as follows:

```typescript
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY') private readonly bookRepository: BookRepository,
  ) {
  }
}
```

### Polymorphic Pattern Implementation Details

Another interesting detail from `BookModule` is that the implementation of the book repository uses
Mongoose [schemas](https://mongoosejs.com/docs/guide.html) instead of domain class decorators to decouple database logic
from the book domain model. Mongoose stores and retrieves polymorphic data structures
using [discriminators](http://thecodebarbarian.com/2015/07/24/guide-to-mongoose-discriminators). A discriminator
specifies a `name` and a `schema`. The discriminator name deserves some further reasoning, as it is key for the
operation of the abstract repository infrastructure. Mongoose uses the discriminator name as the value for an
extra field `__t` that adds to every persisted object, but that it is excluded from the output that NestJS provides to
its clients. This is how the aforementioned `instantiateFrom` method is capable of instantiating domain objects. It uses
the value on such a field included in each retrieved Mongoose document to match it against the keys of the map of domain
object types given to the `MongooseRepository` constructor and instantiate the corresponding domain object from the
value of the matching key.

To enable `instantiateFrom` do its job it is paramount to include the field `__t` in the domain object type hierarchy.
The abstract `PolymorphicBook` is in charge of specifying such a field for the book subtypes:

```typescript
type BookType = 'Paper' | 'Audio' | 'Video';

export abstract class PolymorphicBook
  extends Book
  implements PolymorphicEntity {
  @Exclude()
  readonly __t: BookType;

  protected constructor(book: {
    id?: string;
    title: string;
    description: string;
    type: BookType;
  }) {
    super(book);
    this.__t = book.type;
  }
}
```

Book subtypes (e.g., `PaperBook` or `AudioBook`) actually inherit from `PolymorphicBook` instead of `Book`.
Further implementation details on this topic can be found at the `book.ts` file and the `MongooseRepository` class.

### Entity and PolymorphicEntity

As a final note on domain objects: `MongooseRepository` expects the input type parameter to implement the `Entity`
interface. As previously mentioned, this interface models domain any object that is to be identified by an `id`.
Therefore, persistable domain objects must implement `Entity` and specify a field `id` which value is to be populated by
Mongoose as part of most data access operations. Similarly, `PolymorphicEntity` is an extension of `Entity` that
specifies the aforementioned `__t` discriminator field for polymorphic data structures.

### Utilities to Define Custom Schemas

This project includes a couple of utilities to specify custom domain object Mongoose schemas in the
file `mongoose.base-schema.ts` file. Developers are encouraged to use `BaseSchema` as the base for their schema
definitions. The `extendSchema` function allows developers to create domain object schemas that inherit
from `BaseSchema` or any other schema. This is specially convenient when defining schemas for polymorphic data
structures. The following example depicts the definition of `BookSchema` and the sub-schema `PaperBookSchema`:

```typescript
export const BookSchema = extendSchema(
  BaseSchema,
  {
    title: {type: String, required: true},
    description: {type: String, required: false},
  },
  {timestamps: true},
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: {type: Number, required: true, min: 1},
});
```

# Comparison to other Alternatives

Compared to other existing database integration alternatives (e.g., [TypeORM](https://typeorm.io/)
or [Typegoose](https://typegoose.github.io/typegoose/)), this approach is simpler and more lightweight. Additionally,
TypeORM has mainly been developed for relational databases
and [presents several limitations compared to Mongoose](https://eliezer.medium.com/typeorm-mongodb-review-8855903228b1).
Typegoose, on another hand, is yet another Mongoose wrapper that provides TypeScript typing to Mongoose schemas and
models, but it implements the [Active Record](https://en.wikipedia.org/wiki/Active_record_pattern) pattern. It could be
interesting to base the abstract repository on Typegoose in the future, although it would add a new abstraction layer,
thus complicating the current solution. Considering that Mongoose is currently the most mature ODM for MongoDB in NodeJS
applications, leveraging the abstract repository with new required Mongoose features (e.g.,
[implementing various types of relationships between documents belonging to different collections](https://www.bezkoder.com/mongoose-one-to-many-relationship/))
may be a better idea.

# Abstract Repository for other Database Technologies

Extending the repository to provide an implementation
for [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/) or even for another database technology
such as MySQL or PostgreSQL is easy. All you need to do is to create an abstract template for the required database
technology that implements the `Repository` interface and add all the logic required for each of its methods.

# Running the Example Application

## Installation

```bash
$ yarn install
```

## Run the Book Handling NestJS Application

The application requires a running instance of MongoDB. It includes a `docker-compose.yml` file that will fire up a
MongoDB instance, assuming that Docker Desktop is running.

```bash
# run the NestJS application as well as the MongoDB Docker container
$ yarn start:dev

# run the NestJS application with no MongoDB Docker container
$ yarn start 
```

## Run Repository Validation

```bash
# run integration tests
$ yarn test

# run integration tests with coverage
$ yarn test:cov
```

# Contributors

Special thanks to [Alexander Peiker](https://github.com/greenPangea) and [Sergi Torres](https://github.com/sergitorres8)
for all the insightful conversations on this topic.

# Stay in touch

- Author - [Josu Martinez](https://es.linkedin.com/in/josumartinez)

# License

This project is [MIT licensed](LICENSE).
