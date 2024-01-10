import { ClientSession, Connection, UpdateQuery } from 'mongoose';
import { MongooseRepository, TypeMap } from './mongoose.repository';
import { PartialEntityWithId } from './repository';
import { TransactionalRepository } from './transactional-repository';
import { Entity } from './util/entity';
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
   * @param {TypeMap<T>} typeMap a map of domain object types supported by this repository.
   * @param {Connection=} connection (optional) a connection to an instance of MongoDB.
   */
  protected constructor(typeMap: TypeMap<T>, connection?: Connection) {
    super(typeMap, connection);
  }

  /** @inheritdoc */
  async saveAll<S extends T>(
    entities: S[] | PartialEntityWithId<S>[],
    userId?: string,
  ): Promise<S[]> {
    return await runInTransaction(
      async (session: ClientSession) =>
        await Promise.all(
          entities.map(
            async (entity) => await this.save(entity, userId, session),
          ),
        ),
      this.connection,
    );
  }
}
