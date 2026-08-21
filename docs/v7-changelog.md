# Monguito v7 Changelog

Monguito v7 moves the library onto Mongoose v9.x and a refreshed Node.js/TypeScript toolchain. Most of the release is dependency maintenance, but a few of those upgrades ripple into consumer code. Here is the full list of changes:

## Breaking Changes

- [Node.js Version Requirement](#nodejs-version-requirement)
- [Mongoose Peer Dependency](#mongoose-peer-dependency)
- [`{ new: true }` Deprecated in Favor of `{ returnDocument: 'after' }`](#new-true-deprecated-in-favor-of-returndocument-after)
- [`saveAll` Now Saves Sequentially Within a Transaction](#saveall-now-saves-sequentially-within-a-transaction)

## Non-Breaking Notes

- [Relaxed `filters` Option Typing](#relaxed-filters-option-typing)
- [TypeScript 6.x Compatibility](#typescript-6x-compatibility)
- [Why Not TypeScript 7.x?](#why-not-typescript-7x)

## Node.js Version Requirement

Monguito v7 requires Node.js `>=24.19.0` (up from `>=18.18.0` in v6), in step with the wider MongoDB/Mongoose v9 ecosystem and the currently maintained Node.js releases.

### Migration Steps

Upgrade your project's Node.js runtime to `>=24.19.0` before installing monguito v7.

## Mongoose Peer Dependency

Monguito v7 declares `mongoose: ">=9.9.3"` as its peer dependency (previously `>= 8.0.0`).

### Migration Steps

Bump your own project's `mongoose` dependency to `^9.9.3` or later. Because Mongoose v9 ships a newer MongoDB Node.js driver, a couple of driver-level behavioral changes apply to any custom repository code you write on top of `MongooseRepository`/`MongooseTransactionalRepository` — see the following two sections.

## `{ new: true }` Deprecated in Favor of `{ returnDocument: 'after' }`

Mongoose v9's underlying MongoDB driver deprecates the `{ new: true }` option on update queries (`findByIdAndUpdate`, `findOneAndUpdate`, and similar) that ask for the post-update document to be returned. Monguito's own repository code has already been updated internally, but if any of your custom repository methods call these Mongoose query methods directly, you'll want to make the same change.

### Migration Steps

Replace `{ new: true }` with `{ returnDocument: 'after' }` in any direct calls to Mongoose's update-and-return query methods:

```typescript
// Before (Mongoose v8)
this.entityModel
  .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
  .exec();

// After (Mongoose v9)
this.entityModel
  .findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' })
  .exec();
```

## `saveAll` Now Saves Sequentially Within a Transaction

`MongooseTransactionalRepository.saveAll` used to `save` all given entities concurrently (via `Promise.all`) within the same transaction/session. MongoDB does not allow multiple concurrent operations on a single session, so `saveAll` now saves entities sequentially instead.

No code change is required on your end, but if your application performs large bulk saves inside a transaction, be aware that `saveAll` no longer parallelizes those writes. Monguito remains a lightweight repository abstraction and isn't intended to guarantee high-throughput transactional workloads.

## Relaxed `filters` Option Typing

The `filters` property of `FindAllOptions`, `FindOneOptions`, and `DeleteAllOptions` was typed using Mongoose's `FilterQuery<T>`. Mongoose v9 no longer exposes a `FilterQuery` type usable in the same way, so this property is now typed `any`.

This is a type-level relaxation, not a runtime behavior change — existing filter objects keep working exactly as before. You simply lose the compile-time shape-checking that `FilterQuery<T>` used to provide.

## TypeScript 6.x Compatibility

Monguito's own build now targets TypeScript 6.0.3 (up from 5.7.2). TypeScript isn't a peer dependency of monguito, but if your project also upgrades to TypeScript 6.x and uses `@nestjs/mongoose`, you may run into a TypeScript 6.0.3 regression that mis-resolves `MongooseModuleOptions`, treating several of the MongoDB driver's TLS/socket `ConnectOptions` properties as required when they should be optional (this compiles cleanly under TypeScript 5.7.2 with the exact same `node_modules`).

### Migration Steps

Until upstream resolves the regression, cast your Mongoose connection options object as `MongooseModuleOptions`:

```typescript
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

const mongooseModuleOptions = {
  directConnection: true,
  replicaSet: 'rs0',
} as MongooseModuleOptions;

MongooseModule.forRoot(
  'mongodb://localhost:27017/my-db',
  mongooseModuleOptions,
);
```

## Why Not TypeScript 7.x?

We deliberately stayed on TypeScript 6.x rather than jumping to TypeScript 7.x. Monguito is a relatively small library that wouldn't meaningfully benefit from TypeScript 7's compiler performance improvements, and the version of `ts-jest` monguito currently depends on requires extra compatibility setup to support TypeScript 7 that isn't worth the added complexity for a project this size. We'll revisit this once the tooling story around TypeScript 7 settles.
