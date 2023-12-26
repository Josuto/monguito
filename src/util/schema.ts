import { Schema, SchemaDefinition, SchemaOptions } from 'mongoose';

/**
 * Base schema to be extended by all persistable domain object schemas.
 */
export const BaseSchema = new Schema(
  {},
  {
    // required to deserialize Entity objects
    toObject: {
      transform: (document: any, result: any) => {
        result.id = document.id;
        delete result._id;
      },
    },
  },
);

/**
 * Schema to be extended by all persistable domain objects that require audit capability.
 */
export const AuditableSchema = extendSchema(
  BaseSchema,
  {
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
    toObject: {
      transform: (document: any, result: any) => {
        result.id = document.id;
        result.version = document.__v;
        delete result._id;
        delete result.__v;
      },
    },
  },
);
AuditableSchema.plugin(setUserAuditData);

// Mongoose plugin definition
function setUserAuditData(schema: Schema) {
  schema.pre('save', function (next) {
    if (this.$locals.userId) {
      if (!this.createdBy) {
        this.createdBy = this.$locals.userId;
      }
      this.updatedBy = this.$locals.userId;
    }
    delete this.$locals.userId;
    next();
  });
}

type Plugin = { fn: (schema: Schema) => void; opts?: undefined };

/**
 * Creates a new schema from the given data.
 *
 * @param schema a schema to extend from.
 * @param definition some second schema definition.
 * @param options (optional) some second schema options.
 * @returns a new schema that integrates the contents of the given parameters.
 */
export function extendSchema<T = object, S = object>(
  schema: Schema<T>,
  definition: SchemaDefinition<S>,
  options?: SchemaOptions,
): Schema<T & S> {
  const newSchema = new Schema<T & S>(
    { ...schema.obj, ...definition },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    { ...schema.options, ...options },
  );
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  schema.plugins.forEach((plugin: Plugin) => {
    newSchema.plugin(plugin.fn, plugin.opts);
  });
  return newSchema;
}
