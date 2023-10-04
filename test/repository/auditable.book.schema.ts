import { extendSchema } from '../../src';
import { AuditableSchema } from '../../src/util/schema';

export const AuditableBookSchema = extendSchema(AuditableSchema, {
  title: { type: String, required: true },
  description: { type: String, required: false },
  isbn: { type: String, required: true, unique: true },
});

export const AuditablePaperBookSchema = extendSchema(AuditableBookSchema, {
  edition: { type: Number, required: true, min: 1 },
});
