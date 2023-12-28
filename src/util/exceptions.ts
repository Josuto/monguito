abstract class Exception extends Error {
  readonly error?: Error;

  constructor(message: string, error?: Error) {
    super(message);
    this.error = error;
  }
}

/**
 * Models a client provided illegal argument exception.
 */
export class IllegalArgumentException extends Exception {
  /**
   * Creates an `IllegalArgumentException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error=} error (optional) the wrapped error.
   */
  constructor(message: string, error?: Error) {
    super(message, error);
  }
}

/**
 * Models an undefined persistable domain object constructor exception.
 */
export class UndefinedConstructorException extends Exception {
  /**
   * Creates an `UndefinedConstructorException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error=} error (optional) the wrapped error.
   */
  constructor(message: string, error?: Error) {
    super(message, error);
  }
}

/**
 * Models a persistable domain object schema validation rule violation exception.
 */
export class ValidationException extends Exception {
  /**
   * Creates an `ValidationException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error=} error (optional) the wrapped error.
   */
  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
