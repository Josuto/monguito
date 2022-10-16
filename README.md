## Description

Abstract repository implementation in [NestJS](https://github.com/nestjs/nest). Inspired
in [Spring Data](https://spring.io/projects/spring-data), this abstract repository provides a consistent programming
model for data access and persistence operations that enables enterprise application developers to easily and seamlessly
build the database layer. It specifies a ```Repository``` interface that defines several repository common
methods. ```Repository``` may be implemented by any class that models a concrete repository technology. This project
includes an implementation for MongoDB using [Mongoose](https://mongoosejs.com/).

All the classes composing the abstract repository are included at the ```adapters``` folder. Besides, you may find the
abstract repository integration tests under the ```__tests__``` folder. Following Clean Code, these tests also represent
the documentation of the abstract repository API.

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
