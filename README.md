![Code size](https://img.shields.io/github/languages/code-size/josuto/node-abstract-repository)
![Min code size](https://img.shields.io/bundlephobia/minzip/node-abstract-repository)
[![CI](https://github.com/josuto/nestjs-abstract-repository/actions/workflows/pipeline.yml/badge.svg?branch=main)](https://github.com/josuto/node-abstract-repository/actions/workflows/pipeline.yml)
[![NPM](https://img.shields.io/npm/v/node-abstract-repository)](https://www.npmjs.com/package/node-abstract-repository)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
[![Twitter](https://img.shields.io/twitter/follow/elkartech?style=social)](https://twitter.com/elkartech)

This is a lightweight and type-safe library that implements an abstract
and [polymorphic](https://www.mongodb.com/developer/products/mongodb/polymorphic-pattern/)
[repository](https://www.martinfowler.com/eaaCatalog/repository.html)
for [Node.js](https://nodejs.org/), currently focused on [MongoDB](https://www.mongodb.com/). It has been designed to
help developers focus on defining any custom repository in a fast, easy, and structured manner, releasing them from
having to write basic CRUD operations, while decoupling domain from persistence logic.

# Main Contents

- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [Write Your Own Repository Interfaces](#write-your-own-repository-interfaces)
- [Some Important Implementation Details](#some-important-implementation-details)
- [Comparison to other Alternatives](#comparison-to-other-alternatives)
- [Add Support for other Database Technologies](#add-support-for-other-database-technologies)
- [Contributors](#contributors)

# Installation

You can install `node-abstract-repository`with npm:

```shell
npm install node-abstract-repository
```

Or yarn:

```shell
yarn add node-abstract-repository
```

# Usage

Creating your repository with custom database operations is very straight forward. Say you want to create a custom
repository to handle database operations over instances of a `Book` and any of its subtypes (e.g., `PaperBook`
and `AudioBook`). Here's the implementation of a custom repository that deals with persistable instances of `Book`:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book> {
  constructor() {
    super({
      Default: {type: Book, schema: BookSchema},
      PaperBook: {type: PaperBook, schema: PaperBookSchema},
      AudioBook: {type: AudioBook, schema: AudioBookSchema},
    });
  }

  async findByIsbn<T extends Book>(isbn: string): Promise<Optional<T>> {
    if (!isbn)
      throw new IllegalArgumentException('The given ISBN must be valid');
    return this.entityModel
      .findOne({isbn: isbn})
      .exec()
      .then((book) => Optional.ofNullable(this.instantiateFrom(book) as T));
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

No more leaking of the persistence logic into your domain/application logic!

## Polymorphic Domain Model Specification

`MongooseBookRepository` handles database operations over a _polymorphic_ domain model that defines `Book` as supertype
and `PaperBook` and `AudioBook` as subtypes. Code complexity to support polymorphic domain models is hidden
at `MongooseRepository`; all that is required is that `MongooseRepository` receives a map describing the domain model.
Each map entry key relates to a domain object type, and the related entry value is a reference to the constructor and
the database [schema](https://mongoosejs.com/docs/guide.html) of such domain object. The `Default` key is mandatory and
relates to the supertype, while the rest of the keys relate to the subtypes. Beware that subtype keys are named after
the type name. If it so happens that you do not have any subtype in your domain model, no problem! Just specify the
domain object that your custom repository is to handle as the sole map key-value, and you are done.

Regarding schemas: I believe that writing your own database schemas is a good practice, as opposed of using decorators
at your domain model. This is mainly to avoid marrying the underlying infrastructure, thus enabling you to easily get
rid of this repository logic if something better comes in. It also allows you to have more control on the persistence
properties of your domain objects. After all, database definition is a thing that Mongoose is really rock-solid about.

# Examples

You may find an example of how to instantiate and use a repository that performs CRUD operations over instances
of `Book` and its aforementioned subtypes under [`book.repository.test.ts`](test/book.repository.test.ts). This is a
complete set of unit test cases used to validate this project.

Moreover, if you are interested in knowing how to inject and use a custom repository in a NestJS application, visit
[`nestjs-mongoose-book-manager`](examples/nestjs-mongoose-book-manager). But before jumping to that link, I would
recommend that you read the following section.

# Write Your Own Repository Interfaces

If you are to inject your newly created repository into an application that uses a Node.js-based framework
(e.g., [NestJS](https://nestjs.com/) or [Express](https://expressjs.com/)) then you may want to do some extra effort and
follow the [Dependency Inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) and _depend on
abstractions, not implementations_. To do so, you simply need to add one extra artefact to your code:

```typescript
export interface BookRepository extends Repository<Book> {
  findByIsbn: <T extends Book>(isbn: string) => Promise<Optional<T>>;
}
```

This interface allows you to create instances of `BookRepository`, and seamlessly switch between implementations for
your repository (e.g., Mongoose-based or [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/)
-based, Postgres, MySQL, etc.) Then, make your custom repository implement `BookRepository` as follows:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements BookRepository {

  // The rest of the code remains the same as before
}
```

If you are not willing to add any new operation at your custom repository, then you could make your repository
implementation class implement `Repository<T>`, where `T` is your domain model supertype. Here is an alternative for the
custom book repository example:

```typescript
export class MongooseBookRepository
  extends MongooseRepository<Book>
  implements Repository<Book> {

  // Simply add a constructor setting your domain model map as before 
}
```

# Some Important Implementation Details

## The Entity Interface

Here is a possible definition for the aforementioned polymorphic book domain model:

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

export class AudioBook extends Book {
  readonly hostingPlatforms: string[];

  constructor(audioBook: {
    id?: string;
    title: string;
    description: string;
    isbn: string;
    hostingPlatforms: string[];
  }) {
    super(audioBook);
    this.hostingPlatforms = audioBook.hostingPlatforms;
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
inheritance-based programming language, and I strongly believe that you are entitled to design the domain model at your
will, with no dependencies to other libraries. But all that being said, you may decide not to use it at all, and that
would be just fine. All you need to do is ensure that your domain objects specify an optional `id` field.

## Basic CRUD Operations

To explain these, let's have a look to `Repository`, the generic interface that `MongooseRepository` implements:

```typescript
export interface Repository<T extends Entity> {
  findById: <S extends T>(id: string) => Promise<Optional<S>>;
  findAll: <S extends T>() => Promise<S[]>;
  save: <S extends T>(entity: S | ({ id: string } & Partial<S>)) => Promise<S>;
  deleteById: (id: string) => Promise<boolean>;
}
```

- `findById` returns an [`Optional`](https://github.com/bromne/typescript-optional#readme) value of the searched entity.
- `findAll` returns an array including all the persisted entities, or an empty array otherwise.
- `save` attempts to persist a given entity by either inserting or updating it. This function inserts the entity if it
  is new i.e., if the entity specifies an `id` that is `undefined`. Otherwise, the function updates the persisted entity
  with the properties of the given entity, which may be a `Partial` set of properties. In any case, it returns the
  persisted entity back to its caller.
- `deleteById` deletes an entity matching the given `id` if it exists. When it does, the function returns `true`.
  Otherwise, it returns `false`.

A final note on the definition of `Repository`: `T` refers to a domain object type that implements `Entity` (e.g.,
`Book`), and `S` refers to a subtype of such a domain object type (e.g., `PaperBook` or `AudioBook`). This way, you can
be sure that the resulting values of the CRUD operations are of the type you expect.

## Utilities to Define Your Custom Schemas

This project includes a couple of utilities to ease the specification of custom domain object-related Mongoose schemas.
The `extendSchema` function enables you to create schemas for subtype domain objects that inherit from the supertype
domain object schema. This is specially convenient when defining schemas for polymorphic data structures. The following
example depicts the definition of `BookSchema`, `PaperBookSchema`, and `AudioBookSchema`:

```typescript
export const BookSchema = extendSchema(
  BaseSchema,
  {
    title: {type: String, required: true},
    description: {type: String, required: false},
    isbn: {type: String, required: true, unique: true},
  },
  {timestamps: true},
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: {type: Number, required: true, min: 1},
});

export const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: {type: [{type: String}], required: true},
});
```

Make sure that the schema for your supertype domain object extends from `BaseSchema`. It is required
by `MongooseRepository` to properly deserialise your domain objects.

# Comparison to other Alternatives

First and foremost, this approach is simpler and more lightweight than other existing database integration
alternatives (e.g., [TypeORM](https://typeorm.io/) or [Typegoose](https://typegoose.github.io/typegoose/)).
Additionally, TypeORM has mainly been developed for relational databases
and [presents several limitations compared to Mongoose](https://eliezer.medium.com/typeorm-mongodb-review-8855903228b1).
Typegoose, on another hand, is yet another Mongoose wrapper that provides TypeScript typing to Mongoose schemas and
models, but it implements the [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html) pattern instead of
the Repository pattern. Moreover, this approach is also type-safe. Although it could be interesting to base the
abstract repository on Typegoose in the future, it would add a new abstraction layer, thus complicating the current
solution both in logic and size. Considering that Mongoose is currently the most mature MongoDB handling utility, it
might be a
better idea to leveraging the abstract repository with other Mongoose features (
e.g., [implementing various types of relationships between documents belonging to different collections](https://www.bezkoder.com/mongoose-one-to-many-relationship/)).

# Add Support for other Database Technologies

Extending the repository to provide an implementation
for [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/) or even for another database technology
such as MySQL or PostgreSQL is easy. All you need to do is first create an abstract template for the required database
technology, make it implement the `Repository` interface, and then add all the logic required for each of its methods.

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

- Author - [Josu Martinez](https://es.linkedin.com/in/josumartinez)

# License

This project is [MIT licensed](LICENSE).
