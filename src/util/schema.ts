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

export function extendSchema(schema: any, definition: any, options?: any) {
  return new mongoose.Schema(
    { ...schema.obj, ...definition },
    { ...schema.options, ...options },
  );
}
