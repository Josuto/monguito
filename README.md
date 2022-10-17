## Description

This project consists of an abstract database repository implementation in [NestJS](https://github.com/nestjs/nest).
Inspired in [Spring Data](https://spring.io/projects/spring-data), an abstract repository provides the base for a
consistent programming model for data access operations. It is aimed to enable enterprise application developers to
easily and seamlessly build the database layer.

The project specifies a ```Repository``` interface that defines several database repository common methods. The
interface is meant to be implemented by classes that models a database repository technology e.g., MongoDB or MySQL. For
example, this project includes an implementation for MongoDB using [Mongoose](https://mongoosejs.com/)
i.e., ```MongooseRepository```. This class is abstract and meant to be a template to be extended by any number of
concrete domain object-specific repository classes.

All the classes composing the abstract repository are included at the ```src/adapters``` folder. Besides, you may find
the abstract repository integration tests under the ```src/adapters/__tests__``` folder. Following Clean Code, these
tests also represent the documentation of the abstract repository API.

### Extending the Abstract Repository Logic

The definition of ```Repository``` can be changed to include more methods or even a different set of methods. However,
due to its abstract nature, these methods should not be specific to any domain object. Thus, if e.g., we were to create
a repository to enable data access on instances of type ```Book``` from MongoDB, we can create a concrete
class ```BookRepository``` that extends the abstract class ```MongooseRepository```, which in turn implements
the ```Repository``` interface. ```BookRepository``` can then specify book specific data access operations
e.g., ```findByAuthor```. One could also develop a domain object specific repository so that it solely
implements ```Repository``` (i.e., without extending any abstract repository template), but it is not advised to do so
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
