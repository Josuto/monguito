import mongoose, { ClientSession, Connection } from 'mongoose';

/**
 * Models a callback function that writes to and reads from the database using a session.
 */
type DbCallback<T> = (session: ClientSession) => Promise<T>;

/**
 * Specifies some transaction options, specifically the Mongoose connection object to create a transaction
 * session from and the maximum amount of times that the callback function is to be retried in the case of
 * any MongoDB transient transaction error.
 */
type TransactionOptions = {
  connection?: Connection;
  retries?: number;
};

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
  return await recursiveRunIntransaction(callback, 0, options);
}

async function startSession(connection?: Connection): Promise<ClientSession> {
  if (connection) {
    return await connection.startSession();
  } else {
    return await mongoose.connection.startSession();
  }
}

const DEFAULT_MAX_RETRIES = 3;

async function recursiveRunIntransaction<T>(
  callback: DbCallback<T>,
  attempt: number,
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
    if (
      isTransientTransactionError(error) &&
      attempt < (options?.retries ?? DEFAULT_MAX_RETRIES)
    ) {
      return recursiveRunIntransaction(callback, ++attempt, options);
    }
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Determines whether the given error is a transient transaction error or not.
 * Transient transaction errors can be safely retried.
 * @param error the given error.
 * @returns `true` if the given error is a transient transaction error, `false otherwise`.
 */
function isTransientTransactionError(error: any): boolean {
  return error.message.includes('does not match any in-progress transactions');
}
