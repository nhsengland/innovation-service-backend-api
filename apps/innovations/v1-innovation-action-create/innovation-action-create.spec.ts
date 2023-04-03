import { TestDataType, TestsHelper } from '@innovations/shared/tests';

import { HttpTestBuilder } from '@innovations/shared/builders/http-test.builder';
import { MockBuilder } from '@innovations/shared/builders/mock.builder';
import { InnovationSectionEnum } from '@innovations/shared/enums';
import { randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import v1InnovationActionCreate from '.';

jest.mock('@innovations/shared/decorators', () => ({  
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
    }),
}));

describe('v1-innovation-action-create Suite', () => {

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {

    new MockBuilder().mockNoSQLServiceInit();
      
    await TestsHelper.init();
    testData = TestsHelper.sampleData;

  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });
  
  describe('200', () => {

    it('should create an action', async () => {
      const httpTestBuilder = new HttpTestBuilder();
      
      const mocks = await new MockBuilder()
        .mockDomainUser(testData.baseUsers.accessor)
        .build(em);

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions')
        .setContext()
        .setParams({ innovationId: testData.innovation.id })
        .setMethod('POST')
        .setAuth(testData.domainContexts.accessor)
        .setBody({
          section: InnovationSectionEnum.COST_OF_INNOVATION,
          description: randText(),
        })
        .invoke<{status: number}>(v1InnovationActionCreate);

      expect(result).toBeDefined();
      expect(result.status).toBe(200);
      
      mocks.reset();
    });

  });

});
