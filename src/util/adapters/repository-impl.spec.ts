import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import {
  closeInMongodConnection,
  deleteAllRecordsFromCollections,
  Element,
  ElementRepository,
  ElementRepositoryImpl,
  ElementSchema,
  insertTestElement,
  rootMongooseTestModule,
} from './repository-impl.spec-util';
import { Optional } from 'typescript-optional';

describe('Given a repository instance', () => {
  let repository: ElementRepository;
  let storedElementId: string;
  const element = new Element({
    name: 'some name',
    description: 'some description',
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: Element.name, schema: ElementSchema },
        ]),
      ],
      providers: [ElementRepositoryImpl],
    }).compile();

    repository = module.get<ElementRepository>(ElementRepositoryImpl);
  });

  beforeEach(async () => {
    storedElementId = await insertTestElement(element);
  });

  describe('when finding an element', () => {
    describe('by an undefined ID', () => {
      it('then retrieves an empty element', async () => {
        const id = undefined as unknown as string;
        const element = await repository.findById(id);

        expect(element).toEqual(Optional.empty());
      });
    });

    describe('by a null ID', () => {
      it('then retrieves an empty element', async () => {
        const id = null as unknown as string;
        const element = await repository.findById(id);

        expect(element).toEqual(Optional.empty());
      });
    });

    describe('by a nonexistent ID', () => {
      it('then retrieves an empty element', async () => {
        const element = await repository.findById('000000000000000000000001');

        expect(element).toEqual(Optional.empty());
      });
    });

    describe('by an existent ID', () => {
      it('then retrieves the element', async () => {
        const element = await repository.findById(storedElementId);

        expect(element).toEqual(element);
      });
    });
  });

  afterEach(async () => {
    await deleteAllRecordsFromCollections(['elements']);
  });

  afterAll(async () => {
    await closeInMongodConnection();
  });
});
