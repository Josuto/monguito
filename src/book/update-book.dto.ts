import { CreateBookDto } from './create-book.dto';
import { IntersectionType, PartialType } from '@nestjs/mapped-types';

class BookWithId {
  readonly id: string;
}

export class UpdateBookDto extends IntersectionType(
  BookWithId,
  PartialType(CreateBookDto),
) {}

// class UpdatePaperBookDto extends PartialType(
//   IntersectionType(BookWithId, CreatePaperBookDto),
// ) {}
//
// class UpdateAudioBookDto extends PartialType(
//   IntersectionType(BookWithId, CreateAudioBookDto),
// ) {}
//
// class UpdateVideoBookDto extends PartialType(
//   IntersectionType(BookWithId, CreateVideoBookDto),
// ) {}
