## Description

This project consists of a lightweight abstract database repository implementation
in [NestJS](https://github.com/nestjs/nest). The intent is to provide a simple base for a consistent programming model
to perform data access operations. It is aimed to enable enterprise application developers to easily and seamlessly
build their database layer.

This approach takes advantage of Typescript generic types. The main component is the parameterized `Repository` interface, which defines several domain model agnostic common database access methods. The interface is meant to be implemented by classes that models a database repository technology e.g., MongoDB or MySQL. This project includes an implementation for MongoDB using [Mongoose](https://mongoosejs.com/) i.e., `MongooseRepository`. This class is an abstract template and a Mongoose adapter to be extended by any number of concrete domain object-specific repository classes.

All the classes composing the abstract repository are included at the `src/adapters` folder. Besides, you may find
the abstract repository integration tests under the `src/adapters/__tests__` folder. Following Clean Code, these
tests also represent the documentation of the abstract repository API.

### Motivation

The main goal of this project is to provide a simple methodology to build database technology and domain model agnostic
database repository logic that can be used at any enterprise application development process. Some other other successful state-of-the-art NodeJS-based database access solutions are
[TypeORM](https://typeorm.io/) or [Typegoose](https://typegoose.github.io/typegoose/). There is even some TypeORM integration with NestJS, and integrating Typegoose should be also easy, according to the [documentation](https://docs.nestjs.com/techniques/database). However, a couple of advantages of this project over the aforementioned solutions are:

- the resulting database repository logic is simpler and more lightweight
- the abstract repositories can easily be extended to define complex queries, since it is not coupled to any concrete
  database technology

On another hand, following Uncle Bob's advice on not marrying any external dependencies (Clean Architecture), this approach does not expect domain objects to specify fields with database technology-required decorators. Instead, developers are encouraged to create other database-related artefacts (such as Mongoose schemas) that will prevent leaking database implementation details into their domain model.

### Extending the Abstract Repository Logic

The definition of `Repository` can be changed to include more methods or even a different set of methods. However,
due to its generic nature, these methods should not be specific to any domain object. Thus, if e.g., we were to create a
repository to enable data access on instances of type `Book` from MongoDB, we can create a concrete
class `BookRepository` that extends the abstract class `MongooseRepository`, which in turn implements
the `Repository` interface. `BookRepository` can then specify book specific data access operations
e.g., `findByAuthor`. One could also develop a domain object specific repository so that it solely
implements `Repository` (i.e., without extending any abstract repository template), but it is not advised to do so
since it defeats the purpose of reusing common database logic.

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
