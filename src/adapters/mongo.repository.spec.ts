import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import {
  closeInMongodConnection,
  deleteAllElements,
  findElementById,
  insertElement,
  rootMongooseTestModule,
} from './mongo.repository.spec-util';
import { Optional } from 'typescript-optional';
import { Element } from '../domain/element';
import {
  ElementRepository,
  ElementSchema,
  MongoElementRepository,
} from './element.repository';

describe('Given a repository instance', () => {
  let repository: ElementRepository;
  let storedElement: Element;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Element.name, schema: ElementSchema },
        ]),
      ],
      providers: [MongoElementRepository],
    }).compile();

    repository = module.get<ElementRepository>(MongoElementRepository);
  });

  beforeEach(async () => {
    const elementToStore = new Element({
      name: 'some name',
      description: 'some description',
    });
    const storedElementId = await insertElement(elementToStore);
    storedElement = new Element({
      ...elementToStore,
      id: storedElementId,
    });
  });

  describe('when finding an element', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.findById(undefined as unknown as string),
        ).rejects.toThrowError('The given element ID must be valid');
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.findById(null as unknown as string),
        ).rejects.toThrowError('The given element ID must be valid');
      });
    });

    describe('by the ID of a nonexistent element', () => {
      it('then retrieves an empty element', async () => {
        const element = await repository.findById('000000000000000000000001');
        expect(element).toEqual(Optional.empty());
      });
    });

    describe('by the ID of an existent element', () => {
      it('then retrieves the element', async () => {
        const element = await repository.findById(storedElement.id!);
        expect(element.get()).toEqual(storedElement);
      });
    });
  });

  describe('when finding all the elements', () => {
    it('then retrieves all the existent elements', async () => {
      const elements = await repository.findAll();
      expect(elements.length).toBe(1);
      expect(elements).toContainEqual(storedElement);
    });
  });

  describe('when saving an element', () => {
    describe('that is undefined', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.save(undefined as unknown as Element),
        ).rejects.toThrowError('The given element must be valid');
      });
    });

    describe('that is null', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.save(null as unknown as Element),
        ).rejects.toThrowError('The given element must be valid');
      });
    });

    describe('that specifies an ID not matching any stored element', () => {
      it('then throws an exception', async () => {
        const elementToUpdate = new Element({
          id: '00007032a61c4eda79230000',
          name: 'new name',
          description: 'new description',
        });

        await expect(repository.save(elementToUpdate)).rejects.toThrowError(
          'There is no document matching the given ID 00007032a61c4eda79230000',
        );
      });
    });

    describe('that has not previously been stored', () => {
      it('then inserts the element', async () => {
        const elementToInsert = new Element({
          name: 'some name',
          description: 'some description',
        });

        const element = await repository.save(elementToInsert);
        expect(element.id).toBeTruthy();
        expect(element.name).toBe(elementToInsert.name);
        expect(element.description).toBe(elementToInsert.description);
      });
    });

    describe('that has previously been stored', () => {
      it('then updates the element', async () => {
        const elementToUpdate = new Element({
          id: storedElement.id,
          name: 'new name',
          description: 'new description',
        });

        const element = await repository.save(elementToUpdate);
        expect(element.id).toBe(elementToUpdate.id);
        expect(element.name).toBe(elementToUpdate.name);
        expect(element.description).toBe(elementToUpdate.description);
      });
    });
  });

  describe('when deleting an element', () => {
    describe('by an undefined ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError('The given element ID must be valid');
      });
    });

    describe('by a null ID', () => {
      it('then throws an exception', async () => {
        await expect(
          repository.deleteById(undefined as unknown as string),
        ).rejects.toThrowError('The given element ID must be valid');
      });
    });

    describe('by the ID of a nonexistent element', () => {
      it('then returns false', async () => {
        const isDeleted = await repository.deleteById(
          '00007032a61c4eda79230000',
        );
        expect(isDeleted).toBe(false);
      });
    });

    describe('by the ID of an existent element', () => {
      it('then returns true and the element has been effectively deleted', async () => {
        const isDeleted = await repository.deleteById(storedElement.id!);
        expect(isDeleted).toBe(true);
        expect(await findElementById(storedElement.id!)).toBe(null);
      });
    });
  });

  afterEach(async () => {
    await deleteAllElements();
  });

  afterAll(async () => {
    await closeInMongodConnection();
  });
});
