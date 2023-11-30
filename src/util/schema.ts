import { Schema } from 'mongoose';

/**
 * Base schema to be extended by all persistable domain object schemas.
 */
export const BaseSchema = new Schema(
  {},
  {
    // required to deserialize Entity objects
    toObject: {
      transform: (document, result) => {
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
  { timestamps: true },
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
export function extendSchema(schema: any, definition: any, options?: any) {
  const newSchema = new Schema(
    { ...schema.obj, ...definition },
    { ...schema.options, ...options },
  );
  schema.plugins.forEach((plugin: Plugin) => {
    newSchema.plugin(plugin.fn, plugin.opts);
  });
  return newSchema;
}
