abstract class Exception extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Models a client provided illegal argument exception.
 */
export class IllegalArgumentException extends Exception {
  /**
   * Creates an `IllegalArgumentException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error} cause (optional) the wrapped error.
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Models an undefined persistable domain object constructor exception.
 */
export class UndefinedConstructorException extends Exception {
  /**
   * Creates an `UndefinedConstructorException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error} cause (optional) the wrapped error.
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Models a persistable domain object schema validation rule violation exception.
 */
export class ValidationException extends Exception {
  /**
   * Creates an `ValidationException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error} cause (optional) the wrapped error.
   */
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
