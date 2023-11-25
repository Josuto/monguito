<p align="center">
  <img src="monguito.png" width="120" alt="Monguito" />
</p>

<p align="center">
  Create custom MongoDB repositories fast and easily
</p>

<div align="center">

![Code size](https://img.shields.io/github/languages/code-size/josuto/monguito)
![Min code size](https://img.shields.io/bundlephobia/minzip/monguito)
[![CI](https://github.com/josuto/monguito/actions/workflows/pipeline.yml/badge.svg?branch=main)](https://github.com/josuto/monguito/actions/workflows/pipeline.yml)
[![NPM](https://img.shields.io/npm/v/monguito)](https://www.npmjs.com/package/monguito)
[![Downloads stat](https://img.shields.io/npm/dt/node-abstract-repository)](http://www.npmtrends.com/node-abstract-repository)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://makeapullrequest.com)

</div>

# Main Contents

- [What is `monguito`?](#what-is-monguito)
- [Getting Started](#getting-started)
- [Supported Database Operations](#supported-database-operations)
- [Examples](#examples)
- [Write Your Own Repository Interfaces](#write-your-own-repository-interfaces)
- [Some Important Implementation Details](#some-important-implementation-details)
- [Comparison to other Alternatives](#comparison-to-other-alternatives)
- [Contributors](#contributors)

# What is `monguito`?

`monguito` is a lightweight and type-safe [MongoDB](https://www.mongodb.com/) handling library for [Node.js](https://nodejs.org/) applications that implements both the Abstract [Repository](https://www.martinfowler.com/eaaCatalog/repository.html) and the [Polymorphic](https://www.mongodb.com/developer/products/mongodb/polymorphic-pattern/) patterns.

It allows developers to define any custom MongoDB repository in a fast, easy, and structured manner, releasing them from having to write basic CRUD operations, while decoupling domain from persistence logic. Despite its small size, it includes several optional features such as seamless audit data handling support.

Last but not least, `monguito` wraps [Mongoose](https://mongoosejs.com/), a very popular and solid MongoDB ODM for Node.js applications. Furthermore, it leverages Mongoose [schemas](https://mongoosejs.com/docs/guide.html) to enable developers focus on their own persistance models, leaving everything else to the library.

# Getting Started

## Installation

You can install `monguito` with npm:

```shell
npm install monguito
```

Or yarn:

```shell
yarn add monguito
```

## Usage

Creating your repository with custom database operations is very straight forward. Say you want to create a custom
repository to handle database operations over instances of a `Book` and any of its subtypes (e.g., `PaperBook`
and `AudioBook`). Here's the implementation of a custom repository that deals with persistable instances of `Book`:

```typescript
class MongooseBookRepository extends MongooseRepository<Book> {
  constructor() {
    super({
      Default: { type: Book, schema: BookSchema },
      PaperBook: { type: PaperBook, schema: PaperBookSchema },
      AudioBook: { type: AudioBook, schema: AudioBookSchema },
    });
  }

  async findByIsbn<T extends Book>(isbn: string): Promise<Optional<T>> {
    if (!isbn)
      throw new IllegalArgumentException('The given ISBN must be valid');
    return this.entityModel
      .findOne({ isbn: isbn })
      .exec()
      .then((book) =>
        Optional.ofNullable(this.instantiateFrom(book) as unknown as T),
      );
  }
}
```

That's it! `MongooseBookRepository` is a custom repository that inherits a series of CRUD operations and adds its own
e.g., `findByIsbn`. It extends `MongooseRepository`, a generic template that specifies several basic CRUD operations
e.g., `findById`, `findAll`, `save`, and `deleteById`. Besides, you can use the protected `entityModel` defined
at `MongooseRepository` to execute any Mongoose operation you wish, as it happens at the definition of `findByIsbn`.

Here is an example on how to create and use an instance of the custom `MongooseBookRepository`:

```typescript
const bookRepository = new MongooseBookRepository();
const books: Book[] = bookRepository.findAll();
```

No more leaking of the persistence logic into your domain/application logic! 🤩

## Polymorphic Domain Model Specification

`MongooseBookRepository` handles database operations over a _polymorphic_ domain model that defines `Book` as supertype
and `PaperBook` and `AudioBook` as subtypes. Code complexity to support polymorphic domain models is hidden
at `MongooseRepository`; all that is required is that `MongooseRepository` receives a map describing the domain model.
Each map entry key relates to a domain object type, and the related entry value is a reference to the constructor and
the database [schema](https://mongoosejs.com/docs/guide.html) of such domain object. The `Default` key is mandatory and
relates to the supertype, while the rest of the keys relate to the subtypes. Beware that subtype keys are named after
the type name. If it so happens that you do not have any subtype in your domain model, no problem! Just specify the
domain object that your custom repository is to handle as the sole map key-value, and you are done.

Regarding schemas: We believe that writing your own database schemas is a good practice, as opposed of using decorators
at your domain model. This is mainly to avoid marrying the underlying infrastructure, thus enabling you to easily get
rid of this repository logic if something better comes in. It also allows you to have more control on the persistence
properties of your domain objects. After all, database definition is a thing that Mongoose is really rock-solid about.

# Supported Database Operations

Let's have a look to `Repository`, the generic interface implemented by `MongooseRepository`. Keep in mind that the current
semantics for these operations are those provided at `MongooseRepository`. If you want any of these operations to behave
differently then you must override it at your custom repository implementation.

```typescript
type PartialEntityWithId<T> = { id: string } & Partial<T>;

interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>(options?: SearchOptions) => Promise<S[]>;
  save: <S extends T>(
    entity: S | PartialEntityWithId<S>,
    userId?: string,
  ) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
```

`T` refers to a domain object type that implements `Entity` (e.g., `Book`), and `S` refers to a subtype of such a domain
object type (e.g., `PaperBook` or `AudioBook`). This way, you can be sure that the resulting values of the CRUD operations
are of the type you expect.

### `findById`

Returns an [`Optional`](https://github.com/bromne/typescript-optional#readme) entity matching the given `id`.
This value wraps an actual entity or `null` in case that no entity matches the given `id`.

The `Optional` type is meant to create awareness about the nullable nature of the operation result on the custom repository
clients. This type helps client code developers to easily reason about all possible result types without having to handle
slippery `null` values or exceptions (i.e., the alternatives to `Optional`), as mentioned by Joshua Bloch in his book
Effective Java. Furthermore, the `Optional` API is quite complete and includes many elegant solutions to handle all use cases.
Check it out!

### `findAll`

Returns an array including all the persisted entities, or an empty array otherwise. This operation accepts some
additional and non-required search `options`:

- `filters`: a [MongoDB entity field-based query](https://www.mongodb.com/docs/manual/tutorial/query-documents/)
  to filter results
- `sortBy`: a [MongoDB sort criteria](https://www.mongodb.com/docs/manual/reference/method/cursor.sort/#mongodb-method-cursor.sort)
  to return results in some sorted order
- `pageable`: pagination data (i.e., `pageNumber` and `offset`) required to return a particular set of results.
  Both values must be a whole positive number to achieve the desired outcome

### `save`

Persists the given entity by either inserting or updating it and returns the persisted entity. It the entity does
not specify an `id`, this function inserts the entity. Otherwise, this function expects the entity to exist in the
collection; if it does, the function updates it or throwns exception if it does not.

Trying to persist a new entity that includes a developer specified `id` is considered a _system invariant violation_;
only Mongoose is able to produce MongoDB identifiers to prevent `id` collisions and undesired entity updates.

Finally, this function specifies an optional `userId` argument to enable user audit data handling (read
[this section](#built-in-audit-data-support) for further details).

### `deleteById`

Deletes an entity matching the given `id` if it exists. When it does, the function returns `true`. Otherwise, it returns `false`.

# Examples

You may find an example of how to instantiate and use a repository that performs CRUD operations over instances
of `Book` and its aforementioned subtypes under [`book.repository.test.ts`](test/book.repository.test.ts). This is a
complete set of unit test cases used to validate this project.

Moreover, if you are interested in knowing how to inject and use a custom repository in a NestJS application, visit
[`nestjs-mongoose-book-manager`](examples/nestjs-mongoose-book-manager). But before jumping to that link, we
recommend reading the following section.

# Write Your Own Repository Interfaces

If you are to inject your newly created repository into an application that uses a Node.js-based framework
(e.g., [NestJS](https://nestjs.com/) or [Express](https://expressjs.com/)) then you may want to do some extra effort and
follow the [Dependency Inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) and _depend on
abstractions, not implementations_. To do so, you simply need to add one extra artefact to your code:

```typescript
interface BookRepository extends Repository<Book> {
  findByIsbn: <T extends Book>(isbn: string) => Promise<Optional<T>>;
}
```

This interface allows you to create instances of `BookRepository`, and seamlessly switch between implementations for
your repository (e.g., Mongoose-based or [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/)
-based, Postgres, MySQL, etc.) Then, make your custom repository implement `BookRepository` as follows:

```typescript
class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository {
  // The rest of the code remains the same as before
}
```

If you are not willing to add any new operation at your custom repository, then you could make your repository
implementation class implement `Repository<T>`, where `T` is your domain model supertype. Here is an alternative for the
custom book repository example:

```typescript
class MongooseBookRepository
  extends MongooseRepository<Book>
  implements Repository<Book> {
  // Simply add a constructor setting your domain model map as before
}
```

# Some Important Implementation Details

## The Entity Interface

Here is a possible definition for the aforementioned polymorphic book domain model:

```typescript
type BookType = {
  id?: string;
  title: string;
  description: string;
  isbn: string;
};

class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: BookType) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
  }
}

type PaperBookType = BookType & { edition: number };

class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: PaperBookType) {
    super(paperBook);
    this.edition = paperBook.edition;
  }
}
```

The one thing that may catch your attention is the interface `Entity` that `Book` implements. Inspired in the _Entity_
concept from [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design), `Entity` models any persistable
domain object type. The interface defines an optional `id` field that all persistable domain object types must define.
The optional nature of the field is due to the fact that its value is internally set by Mongoose. Thus, its value can
safely be `undefined` until the pertaining domain object instance is inserted (i.e., stored for the first time) in the
database.

The fact that `Entity` is an interface instead of an abstract class is not a coincidence; JavaScript is a single
inheritance-based programming language, and we strongly believe that you are entitled to design the domain model at your
will, with no dependencies to other libraries. But all that being said, you may decide not to use it at all, and that
would be just fine. All you need to do is ensure that your domain objects specify an optional `id` field.

## Utilities to Define Your Custom Schemas

The `extendSchema` function eases the specification of the Mongoose schemas of your domain model and let `monguito`
to handle the required implementation details. This function is specially convenient when defining schemas for
polymorphic data structures. The following example depicts the definition of `BookSchema`, `PaperBookSchema`,
and `AudioBookSchema`:

```typescript
const BookSchema = extendSchema(
  BaseSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    isbn: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const PaperBookSchema = extendSchema(BookSchema, {
  edition: { type: Number, required: true, min: 1 },
});

const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: { type: [{ type: String }], required: true },
});
```

Make sure that the schema for your supertype domain object extends from `BaseSchema`. It is required
by `MongooseRepository` to properly deserialise your domain objects.

## Built-in Audit Data Support

You can enable `monguito`'s out-of-the-box audit data handling by just making your domain objects implement
the `Auditable` interface. It specifies the data to audit i.e., creation and last update time and (optionally)
user. Any domain object can implement this interface and add audit data as part of its constructor arguments.
This approach is particularly useful for those domain objects that inherit the members of a superclass. Here is
an example of the use of `Auditable`:

```typescript
type AuditableBookType = BookType & Auditable;

class AuditableBook implements Entity, Auditable {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;
  readonly createdAt?: Date;
  readonly createdBy?: string;
  readonly updatedAt?: Date;
  readonly updatedBy?: string;

  constructor(book: AuditableBookType) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
    this.createdAt = book.createdAt;
    this.createdBy = book.createdBy;
    this.updatedAt = book.updatedAt;
    this.updatedBy = book.updatedBy;
  }
}
```

If you would rather avoid all this boilerplate and you are not planning to make your domain object extend from any other
class, you can make it inherit from `AuditableClass`. This is an abstract class included in `monguito` that implements
`Auditable` and both declares and instantiates all the audit data for you. You may then use `AuditableClass` as follows:

```typescript
type AuditableBookType = BookType & Auditable;

class AuditableBook extends AuditableClass implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: AuditableBookType) {
    super(book);
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
  }
}
```

`monguito` will produce and save the audit data for any domain object implementing `Auditable` or extending
`AuditableClass` that is to be stored in MongoDB invoking the repository `save` operation. The user audit data is
optional; if you want `monguito` to handle it for you, simply invoke `save` with a value for the `userId` input
parameter.

# Comparison to other Alternatives

First and foremost, `monguito` is simpler and more lightweight than other existing database integration
alternatives (e.g., [TypeORM](https://typeorm.io/) or [Typegoose](https://typegoose.github.io/typegoose/)).
Additionally, TypeORM has mainly been developed for relational databases and
[presents several limitations compared to Mongoose](https://eliezer.medium.com/typeorm-mongodb-review-8855903228b1).
Typegoose, on another hand, is yet another Mongoose wrapper that provides TypeScript typing to Mongoose schemas and
models, but it implements the [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html) pattern instead of
the Repository pattern, which in complex domain model scenarios results in query logic duplication. Moreover,
`monguito` is also type-safe.

Considering that Mongoose is currently the most mature MongoDB handling utility, we decided to keep it as `monguito`'s
foundation.

# Project Validation

The application runs an in-memory instance of MongoDB. Its implementation is provided by
the [`mongodb-memory-server` NPM dependency](https://www.npmjs.com/package/mongodb-memory-server).

```shell
# run integration tests
$ yarn install & yarn test

# run integration tests with coverage
$ yarn install & yarn test:cov
```

# Contributors

Thanks to [Alexander Peiker](https://github.com/greenPangea), [Sergi Torres](https://github.com/sergitorres8),
and [Aral Roca](https://github.com/aralroca) for all the insightful conversations on this topic.

# Stay in touch

Author - [Josu Martinez](https://es.linkedin.com/in/josumartinez)

# License

This project is [MIT licensed](LICENSE).
