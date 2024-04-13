import { AuditableSchema, extendSchema } from 'monguito';

export const BookSchema = extendSchema(
  AuditableSchema,
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    isDeleted: { type: Boolean, required: true },
  },
  { timestamps: true },
);

export const PaperBookSchema = extendSchema(BookSchema, {
  edition: { type: Number, required: true, min: 1 },
});

export const AudioBookSchema = extendSchema(BookSchema, {
  hostingPlatforms: { type: [{ type: String }], required: true },
});
