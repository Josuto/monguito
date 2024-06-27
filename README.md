<p align="center">
  <img src="monguito.png" width="120" alt="Monguito" />
</p>

<p align="center">
  Create custom MongoDB repositories fast and easily
</p>

<div align="center">

![Min code size](https://img.shields.io/bundlephobia/minzip/monguito)
[![CI](https://github.com/josuto/monguito/actions/workflows/pipeline.yml/badge.svg?branch=main)](https://github.com/josuto/monguito/actions/workflows/pipeline.yml)
[![NPM](https://img.shields.io/npm/v/monguito)](https://www.npmjs.com/package/monguito)
[![Downloads stat](https://img.shields.io/npm/dt/monguito)](http://www.npmtrends.com/monguito)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://makeapullrequest.com)

</div>

# Main Contents

- [What is `monguito`?](#what-is-monguito)
- [Getting Started](#getting-started)
- [Supported Database Operations](#supported-database-operations)
- [Examples](#examples)
- [Write Your Own Repository Interfaces](#write-your-own-repository-interfaces)
- [Extra Utilities](#extra-utilities)
- [Comparison to other Alternatives](#comparison-to-other-alternatives)
- [Contributors](#contributors)

# What is `monguito`?

`monguito` is a lightweight and type-safe [MongoDB](https://www.mongodb.com/) handling library for [Node.js](https://nodejs.org/) applications that implements both the abstract [repository](https://www.martinfowler.com/eaaCatalog/repository.html) and the [polymorphic](https://www.mongodb.com/developer/products/mongodb/polymorphic-pattern/) patterns.

It allows you (dear developer) to define any custom MongoDB repository in a fast, easy, and structured manner, releasing you from having to write all the boilerplate code for basic CRUD operations, and also decoupling your domain layer from the persistence logic. Moreover, despite its small size, it includes several optional features such as seamless audit data handling support.

Last but not least, `monguito` wraps [Mongoose](https://mongoosejs.com/), a very popular and solid MongoDB ODM for Node.js applications. `monguito` enables you to use any Mongoose feature such as [aggregation pipelines](https://mongoosejs.com/docs/api/aggregate.html) or [middleware functions](https://mongoosejs.com/docs/middleware.html). Furthermore, it leverages Mongoose [schemas](https://mongoosejs.com/docs/guide.html) to enable developers focus on their own persistance models, leaving everything else to the library.

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

Or pnpm:

```shell
pnpm add monguito
```

## Usage

Creating your repository with custom database operations is very straight forward. Say you want to create a custom
repository to handle database operations over instances of a `Book` and any of its subtypes (e.g., `PaperBook`
and `AudioBook`). Here's the implementation of a custom repository that deals with persistable instances of `Book`:

```typescript
class MongooseBookRepository extends MongooseRepository<Book> {
  constructor() {
    super({
      type: Book,
      schema: BookSchema,
      subtypes: [
        { type: PaperBook, schema: PaperBookSchema },
        { type: AudioBook, schema: AudioBookSchema },
      ],
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
i.e., `findById`, `findOne`, `findAll`, `save`, and `deleteById`. Besides, you can use the protected `entityModel` defined
at `MongooseRepository` to execute any Mongoose operation you wish, as it happens at the definition of `findByIsbn`.

Here is an example on how to create and use an instance of the custom `MongooseBookRepository`:

```typescript
const bookRepository = new MongooseBookRepository();
const books: Book[] = bookRepository.findAll();
```

No more leaking of the persistence logic into your domain/application logic! 🤩

### Polymorphic Domain Model Specification

`MongooseBookRepository` handles database operations over a _polymorphic_ domain model that defines `Book` as supertype and `PaperBook` and `AudioBook` as subtypes. This means that, while these subtypes may have a different structure from its supertype, `MongooseBookRepository` can write and read objects of `Book`, `PaperBook`, and `AudioBook` to and from the same collection `books`. Code complexity to support polymorphic domain models is hidden at `MongooseRepository`; all is required is that `MongooseRepository` receives an object describing the domain model.

This object specifies the `type` and `schema` of the supertype (`Book` and `BookSchema`, respectively, in this case). The `schema` enables entity object validation on write operations. Regarding `type`, Monguito requires it to create an internal representation of the domain model. Additionally, when `type` does not refer to an abstract type it serves as a constructor required to instantiate the domain objects resulting from the execution of the CRUD operations included in Monguito's repositories (i.e., `MongooseRepository` and `MongooseTransactionalRepository`) or any custom repository. On another hand, the domain model subtypes (if any) are also encoded in the domain model object. `subtypes` is an array of objects that specify a `type` and `schema` for a domain model subtype, and (possibly) other `subtypes`. Hence, the domain model object is of a recursive nature, allowing developers to seamlessly represent any kind of domain model, no matter its complexity.

Beware that any _leaf_ domain model type cannot be abstract! Leaf domain model types are susceptible of being instantiated during MongoDB document deserialisation; any abstract leaf domain model type will result in a TypeScript error. That would be the case if `PaperBook` is declared an abstract class, or if the domain model is composed by only `Book` and such a class is declared an abstract class.

# Supported Database Operations

The library supports two kinds of CRUD operations: _basic_ and _transactional_. Both kinds specify [atomic](<https://en.wikipedia.org/wiki/Atomicity_(database_systems)>) operations; however, while most of the former are inherently atomic (all but [save](#save)), the latter require some transactional logic to ensure atomicity. Moreover, basic CRUD operations can be safely executed on a MongoDB standalone instance, but transactional CRUD operations are only atomic when run as part of a larger cluster e.g., a sharded cluster or a replica set. Using a MongoDB cluster in your production environment is, by the way, [the official recommendation](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/).

Let's now explore these two kinds of operations in detail.

## Basic CRUD Operations

`Repository` is the generic interface implemented by `MongooseRepository`. Its definition is as follows:

```typescript
type PartialEntityWithId<T> = { id: string } & Partial<T>;

interface Repository<T extends Entity> {
  findById: <S extends T>(
    id: string,
    options?: FindByIdOptions,
  ) => Promise<Optional<S>>;
  findOne: <S extends T>(options?: FindOneOptions<S>) => Promise<Optional<S>>;
  findAll: <S extends T>(options?: FindAllOptions<S>) => Promise<S[]>;
  save: <S extends T>(
    entity: S | PartialEntityWithId<S>,
    options?: SaveOptions,
  ) => Promise<S>;
  deleteById: (id: string, options?: DeleteByIdOptions) => Promise<boolean>;
}
```

`T` refers to a domain object type that implements `Entity` (e.g., `Book`), and `S` refers to a subtype of such a domain
object type (e.g., `PaperBook` or `AudioBook`). This way, you can be sure that the resulting values of the CRUD operations
are of the type you expect.

> [!NOTE]
> Keep in mind that the current semantics for these operations are those provided at `MongooseRepository`. If you want any of these operations to behave differently then you must override it at your custom repository implementation.

> [!NOTE]
> All CRUD operations include an `options` parameter as part of their signature. This parameter specifies some optional configuration options. There are two types of options: _behavioural_ and _transactional_. The former dictate the behaviour of the operation, thus influencing the operation result, while the later are required to execute the operation within a MongoDB transaction. You may read more about transactional options in the [following section](#transactional-crud-operations). This section focuses on behavioural options only.

### `findById`

Returns an [`Optional`](https://github.com/bromne/typescript-optional#readme) entity matching the given `id`.
This value wraps an actual entity or `null` in case that no entity matches the given `id`.

> [!NOTE]
> The `Optional` type is meant to create awareness about the nullable nature of the operation result on the custom repository
> clients. This type helps client code developers to easily reason about all possible result types without having to handle
> slippery `null` values or exceptions (i.e., the alternatives to `Optional`), as mentioned by Joshua Bloch in his book
> [Effective Java](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/). Furthermore, the `Optional` API is quite complete and includes many elegant solutions to handle all use cases. Check it out!

### `findOne`

Returns an [`Optional`](https://github.com/bromne/typescript-optional#readme) entity matching the value of some given `filters` option property. If no value is provided, then an arbitrary stored (if any) entity is returned. In case there are more than one matching entities, `findOne` returns the first entity satisfying the condition. The result value wraps an actual entity or `null` if no entity matches the given conditions.

### `findAll`

Returns an array including all the persisted entities, or an empty array otherwise.

This operation accepts some option properties:

- `filters`: a [MongoDB search criteria](https://www.mongodb.com/docs/manual/tutorial/query-documents/) to filter results
- `sortBy`: a [MongoDB sort criteria](https://www.mongodb.com/docs/manual/reference/method/cursor.sort/#mongodb-method-cursor.sort)
  to return results in some sorted order
- `pageable`: pagination data (i.e., `pageNumber` and `offset`) required to return a particular set of results.
  Both values must be a whole positive number to achieve the desired outcome

### `save`

Persists the given entity by either inserting or updating it and returns the persisted entity. If the entity specifies an `id` field, this function updates it, unless it does not exist in the pertaining collection, in which case this operation results in an exception being thrown. Otherwise, if the entity does not specify an `id` field, it inserts it into the collection. Beware that trying to persist a new entity that includes a developer specified `id` is considered a _system invariant violation_; only Mongoose is able to produce MongoDB identifiers to prevent `id` collisions and undesired entity updates.

This operation accepts `userId` as an option property to enable user audit data handling (read [this section](#built-in-audit-data-support) for further details on this topic).

> [!WARNING]
> The version of `save` specified at `MongooseRepository` is not [atomic](#supported-database-operations). If you are to execute it in a concurrent environment, make sure that your custom repository extends `MongooseTransactionalRepository` instead.

### `deleteById`

Deletes an entity which `id` field value matches the given `id`. When it does, the function returns `true`. Otherwise, it returns `false`.

## Transactional CRUD Operations

Let's now explore the definition of `TransactionalRepository`, an interface that defines transactional CRUD operations. This interface is an extension of `Repository`, thus includes all the basic CRUD operations. Futhermore, `MongooseTransactionalRepository` is the class that implements `TransactionalRepository`.

```typescript
export interface TransactionalRepository<T extends Entity>
  extends Repository<T> {
  saveAll: <S extends T>(
    entities: (S | PartialEntityWithId<S>)[],
    options?: SaveAllOptions,
  ) => Promise<S[]>;

  deleteAll: <S extends T>(options?: DeleteAllOptions<S>) => Promise<number>;
}
```

> [!NOTE]
> To ensure operation atomicity you must use a MongoDB cluster (e.g., a replica set) and make your custom repository extend `MongooseTransactionalRepository`. All the inherited default CRUD operations (i.e., the operations specified at `Repository` and `TransactionalRepository`) will be then guranteed to be atomic when a client of your custom repository invokes them. If you want to add a custom transactional operation that composes any other default or custom operation to your repository, then use the [`runInTransaction`](#custom-transactional-operations) utility function. You may want to check the implementation of a soft deletion-based version of `deleteAll` [here](examples/nestjs-mongoose-book-manager/README.md/#book-repository) as an example of a custom transactional composite operation.

### `saveAll`

Persists the given list of entities by either inserting or updating them and returns the list of persisted entities. As with the `save` operation, `saveAll` inserts or updates each entity of the list based on the existence of the `id` field. In the event of any error, this operation rollbacks all its changes. In other words, it does not save any given entity, thus guaranteeing operation atomicity.

This operation accepts `userId` as an option property to enable user audit data handling (read [this section](#built-in-audit-data-support) for further details on this topic).

### `deleteAll`

Deletes all the entities matching value of some given `filters` option property and returns the total amount of deleted entities. Beware that if no value is provided for `filters` is provided, then `deleteAll` deletes all the stored entities. In the event of any error, this operation rollbacks all its changes. In other words, it does not delete any stored entity, thus guaranteeing operation atomicity.

# Examples

You may find an example of how to instantiate and use a repository that performs basic CRUD operations over instances
of `Book` and its aforementioned subtypes at [`book.repository.test.ts`](test/book.repository.test.ts). You may also find an example on `monguito`'s transactional CRUD operations at [`book.transactional-repository.test.ts`](test/book.transactional-repository.test.ts).

Moreover, if you are interested in knowing how to inject and use a custom repository in a NestJS application, visit [`nestjs-mongoose-book-manager`](examples/nestjs-mongoose-book-manager). But before jumping to that link, I recommend reading the following section.

# Write Your Own Repository Interfaces

If you are to inject your newly created repository into an application that uses a Node.js-based framework
(e.g., [NestJS](https://nestjs.com/) or [Express](https://expressjs.com/)) then you may want to do some extra effort and
follow the [Dependency Inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle) to _depend on
abstractions, not implementations_. You simply need to add one extra artefact to your code:

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

# Extra Utilities

## The Entity Interface

Here is a possible definition for the aforementioned polymorphic book domain model:

```typescript
class Book implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: Book) {
    this.id = book.id;
    this.title = book.title;
    this.description = book.description;
    this.isbn = book.isbn;
  }
}

class PaperBook extends Book {
  readonly edition: number;

  constructor(paperBook: PaperBook) {
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
inheritance-based programming language, and I strongly believe that you are entitled to design the domain model at your
will, with no dependencies to other libraries. But all that being said, you may decide not to use it at all, and that
would be just fine. All you need to do is ensure that your domain objects specify an optional `id` field.

## Define Your Own Schemas

I believe that writing your own database schemas is a good practice, as opposed to using decorators
at your domain model. This is mainly to avoid marrying the underlying infrastructure, thus enabling you to easily get
rid of this repository logic if something better comes in. It also allows you to have more control on the persistence
properties of your domain objects. After all, database definition is a thing that Mongoose is really rock-solid about.

`monguito` includes `BaseSchema`, a Mongoose schema that specifies some logic required to convert MongoDB documents
to domain objects. You could implement such a function yourself or use the `extendSchema` utility function to extend
`BaseSchema` with your schema definition. Moreover, `extendSchema` allows you to register any standalone [Mongoose plugin](https://plugins.mongoosejs.io/) of your liking into the resulting schema. This function automatically adds all the Mongoose plugins included in the input schemas
to the resulting schema.

The following example shows the convenience of using `extendSchema` to define schemas for polymorphic data structures,
as well as how to register a standalone Mongoose plugin:

```typescript
import uniqueValidator from 'mongoose-unique-validator';

const BookSchema = extendSchema(
  BaseSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    isbn: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
    plugins: [{ fn: uniqueValidator }], // register the plugin
  },
);

const PaperBookSchema = extendSchema(BookSchema, {
  edition: { type: Number, required: true, min: 1 },
});

const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: { type: [{ type: String }], required: true },
});
```

## Built-in Audit Data Support

You can enable `monguito`'s out-of-the-box audit data handling by just making your domain objects implement
the `Auditable` interface. It specifies the data to audit i.e., creation and last update time and (optionally)
user. Any domain object can implement this interface and add audit data as part of its constructor arguments.
This approach is particularly useful for those domain objects that inherit the members of a superclass. Here is
an example of the use of `Auditable`:

```typescript
class AuditableBook implements Entity, Auditable {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;
  readonly createdAt?: Date;
  readonly createdBy?: string;
  readonly updatedAt?: Date;
  readonly updatedBy?: string;

  constructor(book: AuditableBook) {
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
class AuditableBook extends AuditableClass implements Entity {
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly isbn: string;

  constructor(book: AuditableBook) {
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
parameter as `options` parameter.

## Custom Transactional Operations

> [!WARNING]
> Custom transactional operations are only guaranteed to be atomic when executed on a MongoDB cluster.

Mongoose provides the means to write transactional operations i.e., database operations that compose other operations that are to run within one single transaction. For each transactional operation, the procedure consists of (1) creating a transaction session, (2) invoking a callback function specifying the actual database operation logic at hand, (3) if success commiting the transaction, (4) aborting the transaction under operation failure, and finally (5) ending the session.

This is a pretty cumbersome procedure to follow. `monguito` includes `runInTransaction`, a utility function that removes all this procedural boilerplate and lets you focus on defining your operations actual logic. This function receives a `callback` function implementing such logic and some transactional `options` parameter. You can use this parameter to specify a MongoDB `connection` to create a new transaction session from, or a reference to an existing transaction `session`.

You may want to check the implementation of a soft deletion-based version of `deleteAll` [here](examples/nestjs-mongoose-book-manager/README.md/#book-repository) as an example of a custom transactional operation.

# Comparison to other Alternatives

First and foremost, `monguito` is simpler and more lightweight than other existing database integration
alternatives (e.g., [TypeORM](https://typeorm.io/) or [Typegoose](https://typegoose.github.io/typegoose/)).
Additionally, TypeORM has mainly been developed for relational databases and
[presents several limitations compared to Mongoose](https://eliezer.medium.com/typeorm-mongodb-review-8855903228b1).
Typegoose, on another hand, is yet another Mongoose wrapper that provides TypeScript typing to Mongoose schemas and
models, but it implements the [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html) pattern instead of
the Repository pattern, which in complex domain model scenarios results in query logic duplication. Moreover,
`monguito` is also type-safe.

Considering that Mongoose is currently the most mature MongoDB handling utility, I decided to keep it as `monguito`'s
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
