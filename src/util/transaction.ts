import mongoose, { ClientSession, Connection } from 'mongoose';

/**
 * Models a callback function that writes to and reads from the database using a session.
 */
export type DbCallback<T> = (session: ClientSession) => Promise<T>;

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
): Promise<T> {
  let session: ClientSession;
  if (connection) {
    session = await connection.startSession();
  } else {
    session = await mongoose.startSession();
  }
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
