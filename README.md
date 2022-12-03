## Description

This project consists of a lightweight generic MongoDb repository implementation
in [NestJS](https://github.com/nestjs/nest) using [Mongoose](https://mongoosejs.com/). The intent is to provide a simple
base for a consistent programming model to perform MongoDb data access operations thus enabling enterprise application
developers to easily and seamlessly build their database layer on the top of it.

This approach takes advantage of Typescript generic types. The main component is the parameterized `Repository`
interface, which defines several domain model agnostic common database access methods. This project also includes an
implementation for MongoDB with Mongoose i.e., `MongooseRepository`. This class is an abstract template to be extended
by concrete domain object-specific repository classes.

All the classes composing the generic repository are located under the `src/repository` folder, including the unit tests
that validate the logic of the generic repository implementation. These tests also represent the documentation for the
generic repository.

### Motivation

The main goal of this project is to provide a simple methodology to build technology and domain model agnostic database
repository logic that can be used at any NestJS enterprise application development process. Some other successful
state-of-the-art NodeJS-based database access solutions are
[TypeORM](https://typeorm.io/) or [Typegoose](https://typegoose.github.io/typegoose/). There is even some TypeORM
integration with NestJS, and integrating Typegoose should be also easy, according to
the [documentation](https://docs.nestjs.com/techniques/database).

However, the approach presented in this project presents a simpler and more lightweight database repository logic than
these other alternatives. On another hand, following Uncle Bob's advice on not marrying any external dependencies (Clean
Architecture), this approach does not expect domain objects to specify fields with database technology-required
decorators. Instead, developers are encouraged to create Mongoose schemas to prevent leaking database implementation
details into their domain model.

### Extending the Generic Repository Logic

The definition of `Repository` can be changed to include more methods or even a different set of methods. However, due
to its generic nature, these methods should not be specific to any domain object. Thus, if e.g., we were to create a
repository to enable data access on instances of type `Book` from MongoDB, we can create a concrete
class `BookRepository` that extends the abstract class `MongooseRepository`, which in turn implements the `Repository`
interface. `BookRepository` can then specify book specific data access operations e.g., `findByAuthor`.

## Installation

```bash
$ yarn install
```

## Test

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
