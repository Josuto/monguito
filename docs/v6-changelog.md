# Monguito v6 Changelog

Monguito v6 comes with few changes aimed to improve development experience on custom repository implementation. Here is the full list of changes:

## Breaking Changes

- [Introduction of a New Domain Model Type](#introduction-of-a-new-domain-model-type)
- [Unpublished Monguito Types](#unpublished-monguito-types)
- [New Semantics for `findOne` and `deleteAll`](#new-semantics-for-findone-and-deleteall)
- [Changes on CRUD Operations `option` Properties](#changes-on-crud-operations-option-properties)

## Introduction of a New Domain Model Type

### Problem Statement

Prior to v6, custom repository constructors had to declare a map of type `TypeMap` to represent the domain model to be handled by the repository. This map specifies a domain model supertype definition object identified by the `Default` key and (optionally) a definition object for every domain model subtype identified by a key that must match the name of the subtype.

Here is an example for the `Book` domain model specification using `TypeMap`:

```typescript
{
  Default: { type: Book, schema: BookSchema },
  PaperBook: { type: PaperBook, schema: PaperBookSchema },
  AudioBook: { type: AudioBook, schema: AudioBookSchema },
}
```

This domain model map presents two big issues. On the one hand, many custom repository developers are not aware of the subtype key naming constraint or they find it verbose and confusing. On another hand, this map is limited in nature since it cannot capture complex domain models. Consider an scenario where `PaperBook` has two subypes: `BlackAndWhitePaperBook` and `ColorPaperBook`. There is no way to represent this subtype hierarchy using `TypeMap`.

### Solution Definition

We re-designed the domain model type to overcome the aforementioned problems. Also, we renamed `TypeMap` to `DomainModel` as this way it becomes self-explanatory. Here is an alternative example for the `Book` domain model specification using `DomainModel`:

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

This declaration is more succinct and understandable. Besides, the new domain model type enables _recursive subtype definitions_, thus allowing the declaration of complex domain models. The following domain model example specifies the aforementined scenario:

```typescript
{
  type: Book,
  schema: BookSchema,
  subtypes: [
    {
      type: PaperBook,
      schema: PaperBookSchema,
      subtypes: [
        { type: BlackAndWhitePaperBook, schema: BlackAndWhitePaperBookSchema },
        { type: ColorPaperBook, schema: ColorPaperBookSchema },
      ]
    },
    { type: AudioBook, schema: AudioBookSchema },
  ],
}
```

This new data structure also enabled us to introduce some further TypeScript constraints to disallow _abstract leaf domain type definitions_. Any leaf domain type must be instantiable. This means that in the previous examples `AudioBook` cannot be declared as an abstract class; doing so would result in a TypeScript error, thus improving development experience. Any other root or intermediate domain type definitions may be declared as concrete or abstract classes.

### Migration Steps

Follow the following easy steps to migrate your pre-v6 domain model map to the new domain model type:

1. Extract the supertype definition object (e.g., `{ type: Book, schema: BookSchema }`) as the main contents of your domain model object
2. Create a `subtypes` array property in your domain model object
3. Include any subtype definition object (e.g., `{ type: PaperBook, schema: PaperBookSchema }`) to the `subtypes` array property of your domain model object
4. Repeat steps 2 and 3 for any nested subtype definition objects where appropriate

## Unpublished Monguito Types

We have simplified Monguito API to ease the maintenance of the library. In particular, we unpublished several types related to the new domain model definition. We expect Monguito developers to follow the [recommended way to define their domain model](#solution-definition) without requiring to specify any of these types. As mentioned earlier, we also renamed `TypeMap` to `DomainModel`.

The list of unpublished types are:

- `AbsConstructor`
- `Constructor`
- `SubtypeData`
- `SubtypeMap`
- `SupertypeData`

## New Semantics for `findOne` and `deleteAll`

Prior to v6, `findOne` specified a `filters` parameter as part of its signature. We decided to move it to `options` in v6, as we did with it in `findAll` and `deleteAll` operations for syntactic consistency purposes. Also, if the value of `filters` is `null` in any of these three operations, then the expected result is that of invoking the operation omitting such an options property e.g., `findAll` returns all existing entities.

## Changes on CRUD Operations `option` Properties

We have introduced the following changes on CRUD operation option properties in v6 for development experience improvement purposes:

- Removed `connection` from `TransactionOptions`, since this property is only required by transactional operations (callback functions of `runInTransaction`) to create a new MongoDB session if none already exists. We made `connection` an optional property for the `options` parameter of `runInTransaction` instead. **This change affects all CRUD operations**.
- Constrained the type of `FindAllOptions.sortBy` to be `string` or `SortOrder` (it used to be `any`).
- Constrained the type of `filters` option property to be Mongoose `FilterQuery` (it used to be `any`). `FindOneOptions`, `FindAllOptions`, and `DeleteAllOptions` are now generic types, as required by `FilterQuery`.
