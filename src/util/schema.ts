import { Schema } from 'mongoose';

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

export const AuditableSchema = extendSchema(
  BaseSchema,
  {
    createdBy: { type: String, required: false },
    updatedBy: { type: String, required: false },
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
