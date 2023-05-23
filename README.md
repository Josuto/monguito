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
- [Project Validation](#project-validation)
- [Comparison to other Alternatives](#comparison-to-other-alternatives)
- [Further Development Steps](#further-development-steps)
- [Add Support for other Database Technologies](#add-support-for-other-database-technologies)
- [Legacy: Discriminator Keys on Domain Object Types](#legacy-discriminator-keys-on-domain-object-types)
- [Contributors](#contributors)

# Cut to the Chase

Creating your repository with custom database operations other than the basic CRUD operations is very straight forward.
Say you want to create a custom repository to handle database operations over instances of a `Book` or any of its
subtypes (e.g., `PaperBook` and `AudioBook`). Here's the implementation of a custom repository that deals with
persistable instances of `Book`:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book> {
  constructor(private readonly bookModel: Model<Book>) {
    super(bookModel, {Default: Book, Paper: PaperBook, Audio: AudioBook});
  }

  // Here a custom database operation example 
  async findByIsbn<T extends Book>(isbn: string): Promise<Optional<T>> {
    if (!isbn)
      throw new IllegalArgumentException('The given ISBN must be valid');
    return this.bookModel
      .findOne({isbn: isbn})
      .exec()
      .then((book) => Optional.ofNullable(this.instantiateFrom(book) as T));
  }
}
```

And that's it! `MongooseRepository` is a generic template class that implements several basic CRUD operations
(e.g., `findById`, `findAll`, `save`, and `deleteById`). `MongooseBookRepository` is a custom repository that inherits
all that logic and adds its own (i.e., `findByIsbn`). Moreover, `MongooseBookRepository` is able to handle instances
of `Book` as well as instances of its subtypes, decoupling your domain from the persistence logic.

But how is subtyping supported? Keep on reading.

# Enabling Polymorphic Domain Object Persistence

In other words: How can we persist instances of a domain object type and its subtypes (aka _polymorphic types_) into the
same collection? And as much of an important question: How can we enable their retrieval (instead of retrieving Mongoose
object types)?. If we answer to these questions properly, we are effectively decoupling of the domain and the
persistence logic, as promised above.

Before jumping into this topic, there is an important concept that requires attention: The
Mongoose [`Model`](https://mongoosejs.com/docs/models.html) type. An alternative way of realising `MongooseRepository`
is as a wrapper of Mongoose `Model`; the CRUD functions defined at `MongooseRepository` and (possibly) any custom
repository use those defined at `Model`. This is the case of `findByIsbn` function defined at `MongooseBookRepository`
in the previous code sample. For that reason, when creating any new instance of a custom repository, we must pass a
reference to a `Model`.

Now let's jump into the topic at hand: The second constructor parameter of `MongooseBookRepository` is a map of the
polymorphic types that the custom repository is able to handle. This map is then used internally to convert any
persisted document into the corresponding domain object (sub)type. This is exactly what the `instantiateFrom` function
defined at `MongooseRepository` does.

On another hand, Mongoose handles polymorphic objects
via [discriminators](https://mongoosejs.com/docs/discriminators.html). Discriminators are
"a [schema](https://mongoosejs.com/docs/guide.html) inheritance mechanism". Each discriminator deals with the Mongoose
schema of one domain object subtype, and it is to be registered at the instance of type `Model` consumed by
the `MongooseRepository` constructor function. The registration is performed via the Mongoose `discriminator` function.
Here is some sample code to create an instance of `MongooseBookRepository` capable of handling with instances of `Book`
and its subtypes:

```typescript
const BookModel = mongoose.model(Book.name, BookSchema);
BookModel.discriminator(PaperBook.name, PaperBookSchema);
BookModel.discriminator(AudioBook.name, AudioBookSchema);
const bookRepository = new MongooseBookRepository(BookModel);
```

The `discriminator` function of each domain object type takes two arguments: a _discriminator key_ and a _schema_.
Regarding the former, it is important to note that it is a `string` value meant to match the domain object type name.
The latter, on another hand, refers to the Mongoose schema related to the domain object type. You may find the schemas
for the book domain model at [`book.schema.ts`](test/book.schema.ts). For further information on discriminator keys
please read the [Legacy: Discriminator Keys on Domain Object Types](#legacy-discriminator-keys-on-domain-object-types)
section.

Let's now have a look to the domain model definition for the previous example.

## Book Domain Model

```typescript
export class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    edition: number;
  }) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}
```

The one thing that may catch your attention is the interface `Entity` that `Book` implements. Inspired in the _Entity_
concept from [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), `Entity` models any persistable
domain object type. The interface defines an optional `id` field that all persistable domain objects must define. The
optional nature of the field is due to the fact that its value is set by Mongoose. Thus, it can safely be `undefined`
for a domain object instance until such an instance is created (i.e., stored for the first time) in the database.

The fact that `Entity` is an interface instead of an abstract class is no coincidental; JavaScript is a single
inheritance-based programming language, and it is paramount that any developer designs the domain model at their will.
But all that being said, you may decide not to use it at all, and that would be just fine. All you need to do is ensure
that your domain objects specify an optional `id` field.

# Write your Own Repository Interface

If you are to inject your newly created repository into a Node.js-based application (
e.g., [NestJS](https://nestjs.com/) or [Express](https://expressjs.com/)) then you may want to do some extra effort and
follow the [Dependency Inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) and _depend on
abstractions, not implementations_. To do so, you simply need to add one extra artefact to your code:

```typescript
export interface BookRepository extends Repository<Book> {
  findByIsbn: <T extends Book>(isbn: string) => Promise<Optional<T>>;
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

## The Repository Interface

The main component of this project is the generic `Repository` interface. This interface defines the most basic database
technology-agnostic CRUD operations. You may need it to inject your custom repository as a dependency (specially in the
case that you do not need to provide custom operations), and you must implement it if you are to support the creation of
custom repositories for other database technologies. Here is its current definition:

```typescript
export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>() => Promise<S[]>;
  save: <S extends T>(element: S | ({ id: string } & Partial<S>)) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
```

A final note on the definition of `Repository`: `T` refers to a domain object type that implements `Entity` (e.g.,
`Book`), and `S` refers to a subtype of such a domain object type (e.g., `PaperBook` or `AudioBook`). This is to
enable data access operations over polymorphic data structures.

# Cool, but do you Have any Working Examples?

You may find an example of how to instantiate and use a repository that performs CRUD operations over instances
of `Book` and its aforementioned subtypes under [`book.repository.test.ts`](test/book.repository.test.ts); this is a
complete set of unit test cases for this project.

Moreover, if you are interested in knowing how to inject and use a custom repository in a NestJS application, visit
[`nestjs-mongoose-book-manager`](examples/nestjs-mongoose-book-manager).

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
    title: {type: String, required: true},
    description: {type: String, required: false},
  },
  {timestamps: true},
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: {type: Number, required: true, min: 1},
});
```

# Project Validation

### Installation

Before executing any testing, you first need to install the project dependencies.

```bash
$ yarn install
```

### Run Repository Validation

The application runs an in-memory instance of MongoDB. Its implementation is provided by
the [`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server).

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

- ⚒️ Hide the instantiation of the Mongoose `Model` from the creation of any custom repository
- ⚒️ Remove the need to having to define the map of the supported polymorphic types from the custom repository
  constructor;
  explore the possibility of introducing
  JavaScript [dynamic imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- ✅ Further decouple persistence logic from the definition of domain object types and get rid of the discriminator key
  if possible

# Add Support for other Database Technologies

Extending the repository to provide an implementation
for [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/) or even for another database technology
such as MySQL or PostgreSQL is easy. All you need to do is to create an abstract template for the required database
technology that implements the `Repository` interface and add all the logic required for each of its methods.

# Legacy: Discriminator Keys on Domain Object Types

All versions of this library up to v1.1.0 required the specification of a _discriminator key_ on domain object types
definition. This is not a requirement anymore, as from v1.1.0 forward discriminator keys are dynamically set by
the `MongooseRepository` class, thus completely decoupling persistence logic from domain logic. However, this kind of
domain model definition is still allowed in newer versions for backward compatibility purposes.

But what is a discriminator key and how can it be specified in the domain model? According to the literature, "the way
Mongoose tells the difference between the different discriminator models is by the discriminator key, which is `__t` by
default". This discriminator key is an extra property of type `string` to be added in the definition of the domain
object supertype (`Book` in the example). Any domain object subtype constructor must invoke that of the supertype
passing a value for `__t` that matches the value used when registering its discriminator. For example, considering the
previous code sample, the value for `__t` in `PaperBook` is `Paper`. Here is a possible definition for `Book` as
well as its `PaperBook` and `AuditBook` subtypes:

```typescript
type BookType = 'Paper' | 'Audio';

export class Book implements PolymorphicEntity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;
  readonly __t?: BookType;

  constructor(book: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    type?: BookType;
  }) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
    this.__t = book.type;
  }
}

export class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    edition: number;
  }) {
    super({...paperBook, type: 'Paper'});
    this.edition = paperBook.edition;
  }
}

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];
  readonly format?: string;

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    hostingPlatforms: string[];
  }) {
    super({...audioBook, type: 'Audio'});
    this.hostingPlatforms = audioBook.hostingPlatforms;
  }
}
```

`PolymorphicEntity` models a polymorphic entity. This interface extends `Entity` and specifies an optional `__t`
property. In the previous example, `Book` is actually a `PolymorphicEntity`, since we are interested in also persisting
and accessing `Book` subtype domain objects. However, if we were only to store instances of `Book`, we could have
defined it to implement `Entity` instead. Note that `PolymorphicEntity` is now deprecated as discriminator keys are
internally handled by a newer version of `MongooseRepository`.

There is an example of a legacy custom repository and a domain model under the [`test/legacy`](test/legacy) folder,
which also includes some regression tests to ensure that newer versions of the library are backward compatible with
the old discriminator key-based domain model definition.

# Contributors

Thanks to [Alexander Peiker](https://github.com/greenPangea) and [Sergi Torres](https://github.com/sergitorres8)
for all the insightful conversations on this topic. Also, special thanks for [Aral Roca](https://github.com/aralroca)
for helping me with the creation of the NPM library related to this project.

# Stay in touch

- Author - [Josu Martinez](https://es.linkedin.com/in/josumartinez)

# License

This project is [MIT licensed](LICENSE).
