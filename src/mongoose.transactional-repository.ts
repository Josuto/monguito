import { ClientSession, Connection, UpdateQuery } from 'mongoose';
import { MongooseRepository } from './mongoose.repository';
import { PartialEntityWithId } from './repository';
import { TransactionalRepository } from './transactional-repository';
import { DomainModel } from './util/domain-model';
import { Entity } from './util/entity';
import {
  DeleteAllOptions,
  SaveAllOptions,
  SaveOptions,
} from './util/operation-options';
import { runInTransaction } from './util/transaction';

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
   * @param {DomainModel<T>} domainModel the domain model supported by this repository.
   * @param {Connection=} connection (optional) a MongoDB instance connection.
   */
  protected constructor(domainModel: DomainModel<T>, connection?: Connection) {
    super(domainModel, connection);
  }

  /** @inheritdoc */
  async saveAll<S extends T>(
    entities: (S | PartialEntityWithId<S>)[],
    options?: SaveAllOptions,
  ): Promise<S[]> {
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
  async deleteAll<S extends T>(options?: DeleteAllOptions<S>): Promise<number> {
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
