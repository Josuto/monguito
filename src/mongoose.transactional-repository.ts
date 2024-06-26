import { ClientSession, Connection, UpdateQuery } from 'mongoose';
import { MongooseRepository } from './mongoose.repository';
import { PartialEntityWithId } from './repository';
import { TransactionalRepository } from './transactional-repository';
import { Entity } from './util/entity';
import { IllegalArgumentException } from './util/exceptions';
import {
  DeleteAllOptions,
  SaveAllOptions,
  SaveOptions,
} from './util/operation-options';
import { runInTransaction } from './util/transaction';
import { TypeMap } from './util/type-map';

/**
 * Abstract Mongoose-based implementation of the {@link TransactionalRepository} interface.
 */
export abstract class MongooseTransactionalRepository<
    T extends Entity & UpdateQuery<T>,
  >
  extends MongooseRepository<T>
  implements TransactionalRepository<T>
{
  /**
   * Sets up the underlying configuration to enable database operation execution.
   * @param {TypeMap<T>} typeMap a map of domain object types supported by this repository.
   * @param {Connection=} connection (optional) a MongoDB instance connection.
   */
  protected constructor(typeMap: TypeMap<T>, connection?: Connection) {
    super(typeMap, connection);
  }

  /** @inheritdoc */
  async saveAll<S extends T>(
    entities: (S | PartialEntityWithId<S>)[],
    options?: SaveAllOptions,
  ): Promise<S[]> {
    if (options?.connection)
      console.warn(
        'Since v5.0.1 "options.connection" is deprecated as is of no longer use.',
      );
    return await runInTransaction(
      async (session: ClientSession) =>
        await Promise.all(
          entities.map(
            async (entity) =>
              await this.save(entity, {
                userId: options?.userId,
                session,
              }),
          ),
        ),
      { ...options, connection: this.connection },
    );
  }

  /** @inheritdoc */
  async deleteAll(options?: DeleteAllOptions): Promise<number> {
    if (options?.connection)
      console.warn(
        'Since v5.0.1 "options.connection" is deprecated as is of no longer use.',
      );
    if (options?.filters === null) {
      throw new IllegalArgumentException('Null filters are disallowed');
    }
    return await runInTransaction(
      async (session: ClientSession) =>
        (await this.entityModel.deleteMany(options?.filters, { session }))
          .deletedCount,
      { ...options, connection: this.connection },
    );
  }

  /** @inheritdoc */
  protected async update<S extends T>(
    entity: PartialEntityWithId<S>,
    options?: SaveOptions,
  ): Promise<S> {
    if (options?.connection)
      console.warn(
        'Since v5.0.1 "options.connection" is deprecated as is of no longer use.',
      );
    const updateOperation = super.update.bind(this);
    return await runInTransaction(
      async (session: ClientSession) =>
        await updateOperation(entity, {
          userId: options?.userId,
          session: options?.session ?? session,
        }),
      { connection: this.connection },
    );
  }
}
