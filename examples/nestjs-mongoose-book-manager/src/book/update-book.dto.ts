import { CreateBookDto } from './create-book.dto';

export type UpdateBookDto = {
  id: string;
} & Partial<CreateBookDto>;
