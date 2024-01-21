import mongoose, { ClientSession, Connection } from 'mongoose';

/**
 * Models a callback function that writes to and reads from the database using a session.
 */
export type DbCallback<T> = (session: ClientSession) => Promise<T>;

export type TransactionOptions = {
  retries: number;
};

/**
 * Runs the provided callback function within a transaction and commits the changes to the database
 * iff it has run successfully.
 *
 * @param {DbCallback<T>} callback a callback function that writes to and reads from the database using a session.
 * @param {Connection=} connection (optional) a Mongoose connection to create the session from.
 */
export async function runInTransaction<T>(
  callback: DbCallback<T>,
  connection?: Connection,
  options?: TransactionOptions,
  attempt = 0,
): Promise<T> {
  let session: ClientSession;
  if (connection) {
    session = await connection.startSession();
  } else {
    session = await mongoose.connection.startSession();
  }
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    if (
      isTransientTransactionError(error) &&
      attempt < (options?.retries ?? 3)
    ) {
      return runInTransaction(callback, connection, options, ++attempt);
    }
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Determines whether the given error is a transient transaction error or not.
 * Transient transaction errors can be safely retried.
 *
 * @param error the given error.
 * @returns `true` if the given error is a transient transaction error, `false otherwise`.
 */
function isTransientTransactionError(error: any): boolean {
  return error.message.includes('does not match any in-progress transactions');
}
