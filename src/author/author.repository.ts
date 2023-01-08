import { MongooseRepository } from '../repository/mongoose.repository';
import { Author } from './author';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from '../repository/repository';
import { BaseSchema, extendSchema } from '../repository/mongoose.base-schema';

export const AuthorSchema = extendSchema(
  BaseSchema,
  {
    firstName: { type: String, required: true },
    surname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export type AuthorRepository = Repository<Author>;

export class MongooseAuthorRepository
  extends MongooseRepository<Author>
  implements AuthorRepository
{
  constructor(
    @InjectModel(Author.name)
    private readonly authorModel: Model<Author>,
  ) {
    super(authorModel, { Default: Author });
  }
}
