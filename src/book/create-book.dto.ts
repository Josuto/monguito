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
