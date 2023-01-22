# Description

This project is a lightweight implementation of the Repository pattern for [NestJS](https://github.com/nestjs/nest). It
is intended to provide NestJS applications with a layer of abstraction to decouple domain and persistence logic. The
main component is the parameterized `Repository` interface, which defines several database technology-agnostic CRUD
operations.

Moreover, the project includes a [Mongoose](https://mongoosejs.com/) based MongoDB repository abstract implementation
aimed to release developers from having to write boilerplate code for the database access operations specified
at `Repository`. This implementation is realised in the `MongooseRepository` abstract class, a generic template that
concrete domain object-specific repository classes can extend from. Thus, developers can benefit from the already
implemented MongoDB CRUD operations logic and focus in writing the repository logic pertaining to their own domain.

The repository infrastructure has been designed to enable data access operations both for _plain_ and _polymorphic_ data
structures. The difference between the two is that the former refers to single, non-extensible domain objects, whereas
the latter refers to a subtyping-based class hierarchy. An example of a polymorphic data structure is a `Book` class
that is a supertype for a `PaperBook` and `AudioBook` subclasses. `MongooseRepository` implements
the [Polymorphic pattern](https://www.mongodb.com/developer/products/mongodb/polymorphic-pattern/), thus enabling the
persistence of both supertype and subtype instances in the same collection.

Compared to other existing database integration alternatives (e.g., [TypeORM](https://typeorm.io/)
or [Typegoose](https://typegoose.github.io/typegoose/)), this approach is simpler and more lightweight, making it
suitable for the development of uncomplicated NestJS applications.

Another advantage and an important feature of this abstract repository approach is that all the `find` methods return
an `Optional` of a given domain object type instead of objects of a type defined by the underlying ORM/ODM or database
driver (e.g., `Document` in the case of Mongoose). Similarly, the `save` operation returns an instance of the given
domain object type. This way no database logic is leaked into the corresponding domain model, as advised in the Clean
Architecture book from Uncle Bob, among other many other sources of good software development practices. Furthermore, it
saves developers from having to instantiate domain objects from the outcomes of the data access operations and enables
them to directly execute any domain logic they may specify.

Finally, the current implementation of the Mongoose-based MongoDB abstract repository has been fully validated in
the `book.repository.test.ts` file.

## Example of a Concrete Repository Implementation

`BookRepository` is an interface that extends `Repository` with a data access operation required in the domain of `Book`
handling. Here is the definition for `BookRepository`:

```typescript
export interface BookRepository extends Repository<Book> {
  findByTitle: <T extends Book>(title: string) => Promise<T[]>;
}
```

The class `MongooseBookRepository` is a concrete repository for the domain object `Book` that
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
subtypes (i.e., the domain object type hierarchy) to be handled by the concrete repository. This implementation detail
is required to enable repository `find` and `save` methods to retrieve instances of the pertaining (sub)type of `Book`
. `MongooseRepository` exposes the protected method `instantiateFrom` in charge of performing such instantiation. This
implementation detail may feel verbose, but it is required since JavaScript does not provide any reflection API as other
languages such as Java do to enable the repository data access operations to instantiate persisted objects to their
correct domain types.

Finally, the `default` type is always meant to be the supertype i.e., `Book` in the example above.

## NestJS Application Example

This project includes a dummy NestJS application that invokes several CRUD operations defined at `BookRepository`. Here
is the definition of `BookModule`:

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

### Implementation of the Polymorphic Pattern

An interesting detail from `BookModule` is that the implementation of the book repository uses
Mongoose [schemas](https://mongoosejs.com/docs/guide.html) instead of domain class decorators to (once more)
decouple database logic from the book domain model. Mongoose stores and retrieves polymorphic data structures
using [discriminators](http://thecodebarbarian.com/2015/07/24/guide-to-mongoose-discriminators). A discriminator
specifies a `name` and a `schema`. The discriminator name deserves some further reasoning, as it is key for the
operation of the abstract repository infrastructure. Mongoose uses given discriminator name as the value for an extra
field `__t` that it adds to every persisted object. This is how the aforementioned `instantiateFrom` method is capable
of instantiating domain objects. It uses the value on such a field included in each retrieved Mongoose document to match
it against the keys of the map of domain object types given to the `MongooseRepository` constructor and instantiate the
corresponding domain object from the value of the matching key.

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

Thus, book subtypes (e.g., `PaperBook` or `AudioBook`) actually inherit from `PolymorphicBook` instead of `Book`.
Further implementation details can be found at the `book.ts` file and the `MongooseRepository` class.

### Inversion of Control

Another interesting detail from `BookModule` is that it specifies a provider instantiated using
the `MongooseBookRepository` class. However, this provider can be injected in a service component as follows:

```typescript
export class BookService {
  constructor(
    @Inject('BOOK_REPOSITORY') private readonly bookRepository: BookRepository,
  ) {
  }
}
```

Here the constructor input parameter is of type `BookRepository`, thus
achieving [Inversion of Control](https://en.wikipedia.org/wiki/Inversion_of_control).

## Abstract Repository for other Database Technologies

Extending the repository to provide an implementation
for [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/) or even for another database technology
such as MySQL or PostgreSQL is easy. All you need to do is to create an abstract template for the required database
technology that implements the `Repository` interface and add all the logic required for each of its methods.

## Installation

```bash
$ yarn install
```

## Run the Dummy Book Handling NestJS Application

The application requires a running instance of MongoDB. It includes a `docker-compose.yml` file that will fire up a
MongoDB instance, assuming that Docker Desktop is running.

```bash
$ yarn start:dev
```

## Run Repository Validation

```bash
# run integration tests
$ yarn test

# run integration tests with coverage
$ yarn test:cov
```

## Stay in touch

- Author - [Josu Martinez](https://es.linkedin.com/in/josumartinez)

## License

This project is [MIT licensed](LICENSE).
