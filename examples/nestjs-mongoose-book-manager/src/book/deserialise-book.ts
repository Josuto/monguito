import { AudioBook, Book, PaperBook } from './book';

export const deserialiseBook = (plainBook: any) => {
  if (Object.keys(plainBook).length === 0) {
    return null;
  }
  if (plainBook.edition) {
    return new PaperBook(plainBook);
  } else if (plainBook.hostingPlatforms) {
    return new AudioBook(plainBook);
  } else return new Book(plainBook);
};
