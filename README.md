![Code size](https://img.shields.io/github/languages/code-size/josuto/node-abstract-repository)
![Min code size](https://img.shields.io/bundlephobia/minzip/node-abstract-repository)
[![CI](https://github.com/josuto/nestjs-abstract-repository/actions/workflows/pipeline.yml/badge.svg?branch=main)](https://github.com/josuto/node-abstract-repository/actions/workflows/pipeline.yml)
[![NPM](https://img.shields.io/npm/v/node-abstract-repository)](https://www.npmjs.com/package/node-abstract-repository)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
[![Twitter](https://img.shields.io/twitter/follow/elkartech?style=social)](https://twitter.com/elkartech)

This is a lightweight and type-safe implementation of an abstract
and [polymorphic](https://www.mongodb.com/developer/products/mongodb/polymorphic-pattern/) 
[repository](https://www.martinfowler.com/eaaCatalog/repository.html)
for [Node.js](https://nodejs.org/), currently focused on [MongoDB](https://www.mongodb.com/). It helps developers focus 
on writing custom database access operations in a fast, easy, and structured manner, thus allowing them to properly 
decouple domain and persistence logic.

# Main Contents

- [Cut to the Chase](#cut-to-the-chase)
- [Enabling Polymorphic Domain Object Persistence](#enabling-polymorphic-domain-object-persistence)
- [Write your Own Repository Interface](#write-your-own-repository-interface)
- [Cool, but do you Have any Working Examples?](#cool-but-do-you-have-any-working-examples)
- [Some Important Implementation Details](#some-important-implementation-details)
- [Project Validation](#project-validation)
- [Comparison to other Alternatives](#comparison-to-other-alternatives)
- [Further Development Steps](#further-development-steps)
- [Add Support for other Database Technologies](#add-support-for-other-database-technologies)

# Cut to the Chase

Creating your repository with custom database operations other than the basic CRUD operations is very straight forward.
Say you want to create a custom repository to handle database operations over instances of a `Book` or any of its
subtypes (e.g., `PaperBook` and `AudioBook`). Here's the implementation of a custom repository that deals with
persistable instances of `Book`:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book> {
  constructor(private readonly bookModel: Model<Book>) {
    super(bookModel, { Default: Book, Paper: PaperBook, Audio: AudioBook });
  }

  // Here a custom database operation example 
  async findByTitle<T extends Book>(title: string): Promise<T[]> {
    return this.bookModel
      .find({ title: title })
      .exec()
      .then((books) => books.map((book) => this.instantiateFrom(book)));
  }
}
```

And that's it! `MongooseRepository` is a generic template class that implements several basic CRUD operations
(e.g., `findById`, `findAll`, `save`, and `deleteById`). `MongooseBookRepository` is a custom repository that inherits
all that logic and adds its own (i.e., `findByTitle`). Moreover, `MongooseBookRepository` is able to handle instances
of `Book` as well as instances of its subtypes, decoupling your domain from the persistence logic.

But how is subtyping supported? Keep on reading.

# Enabling Polymorphic Domain Object Persistence

The goal of this section is to explain how to persist instances of a domain object type and its subtypes (aka
_polymorphic types_) into the same collection, as well as how to enable their retrieval (instead of retrieving Mongoose
object types). This is, by the way, the basis to achieve the decoupling of the domain and the persistence logic promoted
by this abstract repository infrastructure.

Before jumping into this topic, there is an important concept that requires attention: The
Mongoose [`Model`](https://mongoosejs.com/docs/models.html) type. An alternative way of realising `MongooseRepository`
is as a wrapper of Mongoose `Model`; the CRUD functions defined at `MongooseRepository` and (possibly) any custom
repository use those defined at `Model`. This is the case of `findByTitle` function defined at `MongooseBookRepository`
in the previous code sample. For that reason, when creating any new instance of a custom repository, we must pass a
reference to a `Model`.

Now let's jump into the topic at hand: The second constructor parameter is a map of the polymorphic types that
the custom repository is able to handle. This map is then used internally to convert any persisted document into the
corresponding domain object (sub)type. This is exactly what the `instantiateFrom` function defined
at `MongooseRepository` does.

On another hand, Mongoose handles polymorphic objects
via [discriminators](https://mongoosejs.com/docs/discriminators.html). Discriminators are
"a [schema](https://mongoosejs.com/docs/guide.html) inheritance mechanism". Each discriminator deals with the Mongoose
schema of one domain object subtype, and it is to be registered at the instance of type `Model` consumed by
the `MongooseRepository` constructor function. The registration is performed via the Mongoose `discriminator` function.
Here is some sample code to create an instance of `MongooseBookRepository` capable of handling with instances of `Book`
and its subtypes:

```typescript
const BookModel = mongoose.model('Book', BookSchema);
BookModel.discriminator('Paper', PaperBookSchema);
BookModel.discriminator('Audio', AudioBookSchema);
const bookRepository = new MongooseBookRepository(BookModel);
```

Finally, let's pay attention to the domain objects type definition. According to the literature, "the way Mongoose tells
the difference between the different discriminator models is by the _discriminator key_, which is `__t` by default".
This discriminator key is an extra property of type `string` to be added in the definition of the domain object
supertype (`Book` in the example). Any domain object subtype constructor must invoke that of the supertype passing a
value for `__t` that matches the value used when registering its discriminator. For example, considering the previous
code sample, the value for `__t` in `PaperBook` must be `Paper`. Here is a possible definition for `Book` and
its `PaperBook` subtype:

```typescript
export class Book implements PolymorphicEntity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly __t?: BookType;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    type?: BookType;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.__t = book.type;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
  }) {
    super({ ...paperBook, type: 'Paper' });
    this.edition = paperBook.edition;
  }
}
```

# Write your Own Repository Interface

If you are to inject your newly created repository into a Node.js-based application (
e.g., [NestJS](https://nestjs.com/) or [Express](https://expressjs.com/)) then you may want to do some extra effort and
follow the [Dependency Inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) and _depend on
abstractions, not implementations_. To do so, you simply need to add one extra artefact to your code:

```typescript
export interface BookRepository extends Repository<Book> {
  findByTitle: <T extends Book>(title: string) => Promise<T[]>;
}
```

This interface will allow you to create instances of `BookRepository`, and seamlessly switch between implementations for
your repository (e.g., Mongoose-based or [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/)
-based, Postgres, MySQL, etc.) Then, make your custom repository implement `BookRepository` as follows:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository {

  // The rest of the code remains the same as before
}
```

# Cool, but do you Have any Working Examples?

You may find an example of how to instantiate and use a repository that performs CRUD operations over instances
of `Book` and its aforementioned subtypes under `test/book.repository.test.ts`; this is a complete set of unit test
cases for this project.

Moreover, if you are interested in knowing how to inject and use a custom repository in a NestJS application, visit
`nestjs-book-manager` under the `examples` folder of this project.

# Some Important Implementation Details

You may want to consider some extra implementation details, specially if you are to extend it to support the creation of
custom repositories for other database technologies.

## Repository, Entity, and PolymorphicEntity Interfaces

The main component of this project is the generic `Repository` interface. This interface defines the most basic database
technology-agnostic CRUD operations. Here is its current definition:

```typescript
export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>() => Promise<S[]>;
  save: <S extends T>(element: S | ({ id: string } & Partial<S>)) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
```

Inspired in the _Entity_ concept
from [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), `Entity` is an interface that models a
persistable domain object type. The interface defines an `id` field that all persistable domain objects must define. The
fact that `Entity` is an interface instead of an abstract class is no coincidental; JavaScript is a single
inheritance-based programming language, and it is paramount that any developer designs the domain type hierarchy at
their will.

On another hand, `PolymorphicEntity` models a polymorphic entity. This interface extends `Entity` and specifies an
optional `__t` property. In the previous example, `Book` is actually a `PolymorphicEntity`, since we are interested in
also persisting and accessing `Book` subtype domain objects. However, if we were only to store instances of `Book`, we
could have defined it to implement `Entity` instead.

Considering this difference between `Entity` and `PolymorphicEntity`, consider the following alternative definition for
the `Book` domain model infrastructure:

```typescript
export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;

  constructor(book: { id?: string; title: string; description: string }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
  }
}

export abstract class PolymorphicBook
  extends Book
  implements PolymorphicEntity {
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

export class PaperBook extends PolymorphicBook {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    edition: number;
  }) {
    super({ ...paperBook, type: 'Paper' });
    this.edition = paperBook.edition;
  }
}
```

This way no abstract repository logic is leaked into the definition of `Book`, although its subtypes definitions require
to extend `PolymorphicBook`.

A final note on the definition of `Repository`: `T` refers to a domain object type that implements `Entity` (e.g., 
`Book`), and `S` refers to a subtype of such a domain object type (e.g., `PaperBook` or `AudioBook`). This is to
enable data access operations over polymorphic data structures.

# Utilities to Define Custom Schemas

This project includes a couple of utilities to specify custom domain object Mongoose schemas. Developers are encouraged
to use `BaseSchema` as the base for their schema definitions. The `extendSchema` function allows developers to create
domain object schemas that inherit from `BaseSchema` or any other schema. This is specially convenient when defining
schemas for polymorphic data structures. The following example depicts the definition of `BookSchema` and the
sub-schema `PaperBookSchema`:

```typescript
export const BookSchema = extendSchema(
  BaseSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
  },
  { timestamps: true },
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: { type: Number, required: true, min: 1 },
});
```

# Project Validation

### Installation

Before executing any testing, you first need to install the project dependencies.

```bash
$ yarn install
```

### Run Repository Validation

The application requires a running instance of MongoDB. It includes a `docker-compose.yml` file that will fire up a
MongoDB instance, assuming that Docker Desktop is running.

```bash
# run integration tests
$ yarn test

# run integration tests with coverage
$ yarn test:cov
```

# Comparison to other Alternatives

Compared to other existing database integration alternatives (e.g., [TypeORM](https://typeorm.io/)
or [Typegoose](https://typegoose.github.io/typegoose/)), this approach is simpler and more lightweight. Additionally,
TypeORM has mainly been developed for relational databases
and [presents several limitations compared to Mongoose](https://eliezer.medium.com/typeorm-mongodb-review-8855903228b1).
Typegoose, on another hand, is yet another Mongoose wrapper that provides TypeScript typing to Mongoose schemas and
models, but it implements the [Active Record](https://en.wikipedia.org/wiki/Active_record_pattern) pattern instead of
the Repository pattern. Moreover, my approach is also type-safe. In any case, it could be interesting to base the
abstract repository on Typegoose in the future, although it would add a new abstraction layer, thus complicating the
current solution. Considering that Mongoose is currently the most mature ODM for MongoDB, leveraging the abstract
repository with other Mongoose features (
e.g., [implementing various types of relationships between documents belonging to different collections](https://www.bezkoder.com/mongoose-one-to-many-relationship/))
may be a better idea.

# Further Development Steps

The current priority is on simplifying the definition and usage of the Mongoose abstract repository. In particular:

- Hide the instantiation of the Mongoose `Model` from the creation of any custom repository
- Remove the need to having to define the map of the supported polymorphic types from the custom repository constructor;
  explore the possibility of introducing
  JavaScript [dynamic imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- Further decouple persistence logic from the definition of domain object types and get rid of the discriminator key if
  possible

# Add Support for other Database Technologies

Extending the repository to provide an implementation
for [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/) or even for another database technology
such as MySQL or PostgreSQL is easy. All you need to do is to create an abstract template for the required database
technology that implements the `Repository` interface and add all the logic required for each of its methods.

# Contributors

Thanks to [Alexander Peiker](https://github.com/greenPangea) and [Sergi Torres](https://github.com/sergitorres8)
for all the insightful conversations on this topic. Also, special thanks for [Aral Roca](https://github.com/aralroca)
for helping me with the creation of the NPM library related to this project.

# Stay in touch

- Author - [Josu Martinez](https://es.linkedin.com/in/josumartinez)

# License

This project is [MIT licensed](LICENSE).
