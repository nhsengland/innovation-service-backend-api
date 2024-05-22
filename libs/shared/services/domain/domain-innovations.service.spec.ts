import { container } from '../../config/inversify.config';
import { TestsHelper } from '../../tests';
import SHARED_SYMBOLS from '../symbols';
import type { DomainInnovationsService } from './domain-innovations.service';
import type { DomainService } from './domain.service';

describe('Domain Innovations Service Suite', () => {
  let sut: DomainInnovationsService;
  const testsHelper = new TestsHelper();

  beforeAll(async () => {
    await testsHelper.init();
    sut = container.get<DomainService>(SHARED_SYMBOLS.DomainService).innovations;
  });

  describe('translate', () => {
    it('should return the translated value', () => {
      const x = sut['translate']({
        INNOVATION_DESCRIPTION: {
          name: 'Test',
          categories: ['AI'],
          mainCategory: 'AI'
        }
      });
      expect(x).toMatchObject({
        INNOVATION_DESCRIPTION: {
          name: 'Test',
          mainCategory: 'Artificial Intelligence',
          categories: ['Artificial Intelligence']
        }
      });
    });
  });
});
