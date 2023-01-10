export class CreateBookDto {
  readonly title: string;
  readonly description: string;

  constructor(dto: { title: string; description: string }) {
    this.title = dto.title;
    this.description = dto.description;
  }
}

export class CreatePaperBookDto extends CreateBookDto {
  readonly edition: number;

  constructor(dto: { title: string; description: string; edition: number }) {
    super(dto);
    this.edition = dto.edition;
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
}

export class CreateVideoBookDto extends CreateBookDto {
  readonly format: string;

  constructor(dto: { title: string; description: string; format: string }) {
    super(dto);
    this.format = dto.format;
  }
}

export const deserialiseBook = (plainBook: any) => {
  if (plainBook.edition) {
    return new CreatePaperBookDto(plainBook);
  } else if (plainBook.hostingPlatforms) {
    return new CreateAudioBookDto(plainBook);
  } else if (plainBook.format) {
    return new CreateVideoBookDto(plainBook);
  } else return new CreateBookDto(plainBook);
};
