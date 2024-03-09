import mongoose, { ClientSession, Connection } from 'mongoose';

/**
 * Models a callback function that writes to and reads from the database using a session.
 */
type DbCallback<T> = (session: ClientSession) => Promise<T>;

/**
 * Specifies some transaction options.
 * @property {Connection=} connection (optional) a Mongoose session required by operations that are to run within a transaction.
 * @property {ClientSession=} session (optional) a transaction session, meaning that the transaction is meant to run within another transaction.
 */
export type TransactionOptions = {
  connection?: Connection;
  session?: ClientSession;
};

const MAX_RETRIES = 3;

/**
 * Runs the provided callback function within a transaction and commits the changes to the database
 * iff it has run successfully.
 *
 * @param {DbCallback<T>} callback a callback function that writes to and reads from the database using a session.
 * @param {TransactionOptions=} options (optional) some options about the transaction.
 */
export async function runInTransaction<T>(
  callback: DbCallback<T>,
  options?: TransactionOptions,
): Promise<T> {
  if (options?.session) return callback(options.session);
  return await recursiveRunIntransaction(callback, 0, options);
}

async function recursiveRunIntransaction<T>(
  callback: DbCallback<T>,
  retries: number,
  options?: TransactionOptions,
): Promise<T> {
  const session = await startSession(options?.connection);
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    if (isTransientTransactionError(error) && retries < MAX_RETRIES) {
      return recursiveRunIntransaction(callback, ++retries, options);
    }
    throw error;
  } finally {
    session.endSession();
  }
}

async function startSession(connection?: Connection): Promise<ClientSession> {
  if (connection) {
    return await connection.startSession();
  } else {
    return await mongoose.connection.startSession();
  }
}

// Transient transaction errors can be safely retried.
function isTransientTransactionError(error: any): boolean {
  return error.message.includes('does not match any in-progress transactions');
}
