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
  constructor(message: string, error?: Error) {
    super(message, error);
  }
}

/**
 * Models an undefined persistable domain object constructor exception.
 */
export class UndefinedConstructorException extends Exception {
  constructor(message: string, error?: Error) {
    super(message, error);
  }
}

/**
 * Models a persistable domain object schema validation rule violation exception.
 */
export class ValidationException extends Exception {
  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
