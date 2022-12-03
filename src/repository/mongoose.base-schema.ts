import mongoose from 'mongoose';

export const BaseSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
    // required to deserialize Entity objects
    toObject: {
      transform: (document, result) => {
        result.id = document.id;
        delete result._id;
      },
    },
  },
);

export function extendSchema(Schema: any, definition: any) {
  return new mongoose.Schema(
    Object.assign({}, Schema.obj, definition),
    Schema.options,
  );
}
