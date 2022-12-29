import mongoose from 'mongoose';

export const BaseSchema = new mongoose.Schema(
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

export const PolymorphicSchema = extendSchema(
  BaseSchema,
  {},
  { discriminatorKey: '__type' },
);

export function extendSchema(Schema: any, definition: any, options?: any) {
  return new mongoose.Schema(
    { ...Schema.obj, ...definition },
    { ...Schema.options, ...options },
  );
}
