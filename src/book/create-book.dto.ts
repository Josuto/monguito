import { AudioBook, Book, PaperBook, VideoBook } from './book';

export class CreateBookDto {
  readonly title: string;
  readonly description: string;

  constructor(dto: { title: string; description: string }) {
    this.title = dto.title;
    this.description = dto.description;
  }

  toBook(): Book {
    return new Book(this);
  }
}

export class CreatePaperBookDto extends CreateBookDto {
  readonly edition: number;

  constructor(dto: { title: string; description: string; edition: number }) {
    super(dto);
    this.edition = dto.edition;
  }

  toBook(): PaperBook {
    return new PaperBook(this);
  }
}

export class CreateAudioBookDto extends CreateBookDto {
  readonly hostingPlatforms: string[];

  constructor(dto: {
    title: string;
    description: string;
    hostingPlatforms: string[];
  }) {
    super(dto);
    this.hostingPlatforms = dto.hostingPlatforms;
  }

  toBook(): AudioBook {
    return new AudioBook(this);
  }
}

export class CreateVideoBookDto extends CreateBookDto {
  readonly format: string;

  constructor(dto: { title: string; description: string; format: string }) {
    super(dto);
    this.format = dto.format;
  }

  toBook(): VideoBook {
    return new VideoBook(this);
  }
}

export const deserialiseBookDto = (plainBook: any) => {
  if (plainBook.edition) {
    return new CreatePaperBookDto(plainBook);
  } else if (plainBook.hostingPlatforms) {
    return new CreateAudioBookDto(plainBook);
  } else if (plainBook.format) {
    return new CreateVideoBookDto(plainBook);
  } else return new CreateBookDto(plainBook);
};
