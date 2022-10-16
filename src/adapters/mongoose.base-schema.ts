import mongoose from 'mongoose';

export const BaseSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
    toObject: {
      transform: (doc, ret) => {
        ret.id = doc.id;
        delete ret._id;
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
