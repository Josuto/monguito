import mongoose from 'mongoose';

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
 * Models an entity instantiation exception.
 */
export class InstantiationException extends Exception {
  /**
   * Creates an `InstantiationException`, optionally wrapping an error.
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
 * Since there may be several properties of the persistable domain object that are invalid,
 * this exception provides means to retrieve the invalid fields altogeher or by kind.
 */
export class ValidationException extends Exception {
  override cause: mongoose.Error.ValidationError;

  /**
   * Creates an `ValidationException`, optionally wrapping an error.
   * @param {string} message the message of the exception.
   * @param {Error} cause (optional) the wrapped error.
   */
  constructor(message: string, cause: mongoose.Error.ValidationError) {
    super(message, cause);
    this.cause = cause;
  }

  /**
   * Retrieves all the invalid field names of the persistable domain object.
   * @returns an array with the names of the invalid fields.
   */
  getInvalidFields(): string[] {
    return Object.keys(this.cause.errors);
  }

  /**
   * Retrieves all the non-specified required field names of the persistable domain object.
   * @returns an array with the names of the required fields that are not specified.
   */
  getInvalidRequiredFields(): string[] {
    return this.getInvalidFieldsOfKind('required');
  }

  /**
   * Retrieves all the duplicated unique field names of the persistable domain object.
   * @returns an array with the names of the unique fields that are duplicated.
   */
  getInvalidUniqueFields(): string[] {
    return this.getInvalidFieldsOfKind('unique');
  }

  private getInvalidFieldsOfKind(kind: string): string[] {
    const invalidFields: string[] = [];
    for (const field in this.cause.errors) {
      const error = this.cause.errors[field];
      if (error.kind === kind) {
        invalidFields.push(error.path);
      }
    }
    return invalidFields;
  }
}
