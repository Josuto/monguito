import { AudioBook, Book, ElectronicBook, PaperBook } from './book';

export const bookFixture = (book: Partial<Book> = {}, id?: string): Book => {
  const defaultBook = {
    title: 'Accelerate',
    description: 'Building High Performing Technology Organizations',
    isbn: '1942788339',
  };
  return new Book({ ...defaultBook, ...book, id });
};

export const paperBookFixture = (
  book: Partial<PaperBook> = {},
  id?: string,
): PaperBook => {
  const defaultBook = {
    title: 'Effective Java',
    description: 'Great book to learn Java',
    isbn: '0134685997',
    edition: 3,
  };
  return new PaperBook({ ...defaultBook, ...book, id });
};

export const audioBookFixture = (
  book: Partial<AudioBook> = {},
  id?: string,
): AudioBook => {
  const defaultBook = {
    title: 'The Phoenix Project',
    description: 'Best IT novel ever',
    isbn: '5573899870',
    hostingPlatforms: ['Audible'],
    format: 'MP3',
  };
  return new AudioBook({ ...defaultBook, ...book, id });
};

export const electronicBookFixture = (
  book: Partial<ElectronicBook> = {},
  id?: string,
): ElectronicBook => {
  const defaultBook = {
    title: 'Clean Code',
    description: 'Pragmatic tips to ensure that your code is readable',
    isbn: '6875234013',
    extension: 'epub',
  };
  return new ElectronicBook({ ...defaultBook, ...book, id });
};
