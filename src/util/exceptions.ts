/**
 * Models a client provided illegal argument exception.
 */
export class IllegalArgumentException extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Models an undefined persistable domain object constructor exception.
 */
export class UndefinedConstructorException extends Error {
  constructor(message: string) {
    super(message);
  }
}
