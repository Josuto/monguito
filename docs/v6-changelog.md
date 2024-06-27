# Monguito v6 Changelog

Monguito v6 comes with few changes aimed to improve Development Experience on custom repository implementation. Here is the full list of changes:

## Breaking Changes

- [Introduction of a new domain model type](#introduction-of-a-new-domain-model-type)
- [Unpublished Monguito types](#unpublished-monguito-types)
- [New semantics for `findOne` and `deleteAll`](#new-semantics-for-findone-and-deleteall)
- [Changes on CRUD operations option properties](#changes-on-crud-operations-option-properties)

## Introduction of a New Domain Model Type

### Problem Statement

Prior to v6, custom repository constructors had to declare a map of type `TypeMap` to declare the domain model to be handled by the repository. This map specifies a domain model supertype definition object identified by the `Default` key and (optionally) a definition object for every domain model subtype identified by a key that matches the name of the subtype.

Here is an example for the `Book` domain model used throughout the Monguito documentation:

```typescript
{
  Default: { type: Book, schema: BookSchema },
  PaperBook: { type: PaperBook, schema: PaperBookSchema },
  AudioBook: { type: AudioBook, schema: AudioBookSchema },
}
```

This domain model map presents two big issues. On the one hand, many custom repository developers are not aware of the subtype key constraint and they found it verbose and confusing. On another hand, this map is limited in nature since it cannot capture complex domain models. Consider an scenario where `PaperBook` has two subypes: `PaperBookBlackAndWhite` and `PaperBookColor`. There is no way to represent this subtype hierarchy using the domain model map.

### Solution Definition

We re-designed the domain model type to overcome the aforementioned problems. Also, we renamed `TypeMap` to `DomainModel` as we believe this way is self-explanatory. Here is an alternative example for the `Book` domain model:

```typescript
{
  type: Book,
  schema: BookSchema,
  subtypes: [
    { type: PaperBook, schema: PaperBookSchema },
    { type: AudioBook, schema: AudioBookSchema },
  ],
}
```

We removed the requirement for a key that identifies any domain model type definition object, thus improving readability. Besides, the new domain model type enables _recursive subtype definitions_, thus allowing the declaration of complex domain models. As an example, here is the object that represents the domain model of the aforementined scenario:

```typescript
{
  type: Book,
  schema: BookSchema,
  subtypes: [
    {
      type: PaperBook,
      schema: PaperBookSchema,
      subtypes: [
        { type: PaperBookBlackAndWhite, schema: PaperBookBlackAndWhiteSchema },
        { type: PaperBookColor, schema: PaperBookColorSchema },
      ]
    },
    { type: AudioBook, schema: AudioBookSchema },
  ],
}
```

This new data structure also enabled us to introduce some further TypeScript constraints to disallow _abstract domain leaf type definitions_. This means that e.g., `AudioBook` cannot be declared as an abstract class in any of the examples that are based on the new domain model type; it would result in a TypeScript error otherwise. This is an important constraint since each domain leaf type serves as a constructor required to instantiate the domain objects resulting from the execution of the CRUD operations included in Monguito's repositories (i.e., `MongooseRepository` and `MongooseTransactionalRepository`) or any custom repository.

### Migration Steps

Follow these steps to migrate your pre-v6 domain model map to the new domain model type:

- Extract the supertype definition object (e.g., `{ type: Book, schema: BookSchema }`) as properties of the new domain model object
- Place any subtype definition object (e.g., `{ type: PaperBook, schema: PaperBookSchema }`) as an item of the `subtypes` array field of the new domain model object

## Unpublished Monguito Types

We have simplified Monguito API to ease the maintenance of the library. In particular, we unpublished several types related to the new domain model definition. We expect Monguito developers to follow the [recommended way to define their domain model](#solution-definition) without requiring to specify any type whatsoever. That being said, we renamed `TypeMap` to `DomainModel`, as we believe it better explains its purpose.

The list of unpublished types are:

- `AbsConstructor`
- `Constructor`
- `SubtypeData`
- `SubtypeMap`
- `SupertypeData`

## New semantics for `findOne` and `deleteAll`

Prior to v6, `findOne` specified a `filters` parameter as part of its signature. We decided to move it to `options` in v6, as we did with it in `findAll` and `deleteAll` operations for convention purposes. Also, if the value of `filters` is `null` in any of these three operations, then the expected result is that of invoking the operation omitting such an options property.

## Changes on CRUD operations option properties

We have introduced the following changes on CRUD operation option properties in v6 for development experience improvement purposes:

- Remove `connection` from `TransactionOptions`. The reason is that this property is only required by transactional operations (callback functions of `runInTransaction`) to create a new MongoDB session if none already exists. This change affects all CRUD operations. We made `connection` an optional property for the `options` parameter of `runInTransaction` instead.
- Constrain the type of `FindAllOptions.sortBy` to be `string` or `SortOrder` (it used to be `any`).
- Constrain the type of `filters` option property to be Mongoose `FilterQuery` (it used to be `any`). `FindOneOptions`, `FindAllOptions`, and `DeleteAllOptions` are now generic types, as required by `FilterQuery`.
