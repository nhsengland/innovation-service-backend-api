import type { TestDataType } from '@innovations/shared/tests/tests.helper';
import TestsHelper from '@innovations/shared/tests/tests.helper';

import { HttpTestBuilder } from '@innovations/shared/builders/http-test.builder';
import { MockBuilder } from '@innovations/shared/builders/mock.builder';
import { InnovationActionStatusEnum, InnovationSectionEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { GenericErrorsEnum } from '@innovations/shared/errors';
import type { ErrorDetailsType } from '@innovations/shared/types';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import v1InnovationActionInfo from '.';
import { InnovationActionsService } from '../_services/innovation-actions.service';
import type { ResponseDTO } from './transformation.dtos';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
}));

describe('v1-innovation-action-info Suite', () => {

  let testData: TestDataType;
  let em: EntityManager;
  const exampleAction = {
    id: randomUUID(),
    displayId: 'UC01',
    status: InnovationActionStatusEnum.COMPLETED,
    section: InnovationSectionEnum.IMPLEMENTATION_PLAN,
    description: "description 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: { name: "name 1", role: ServiceRoleEnum.ACCESSOR },
    createdBy: { id: randomUUID(), name: "name 1", role: ServiceRoleEnum.ACCESSOR, organisationUnit: { id: randomUUID(), name: "NHS Innovation Service", acronym: "NHS-IS" } },
  }

  beforeAll(async () => {

    new MockBuilder()
      .mockNoSQLServiceInit()
      .mockCacheServiceThis();

    await TestsHelper.init();
    testData = TestsHelper.sampleData;

  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('200', () => {

    it('should return an action', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const mocks = await new MockBuilder()
        .mockDomainUser(testData.baseUsers.accessor)
        .build(em);

      jest.spyOn(InnovationActionsService.prototype, 'getActionInfo').mockResolvedValue(exampleAction as any);

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions/:actionId')
        .setContext()
        .setParams({ innovationId: testData.innovation.id, actionId: exampleAction.id })
        .setMethod('GET')
        .setAuth(testData.domainContexts.accessor)
        .invoke<{ status: number, body: ResponseDTO }>(v1InnovationActionInfo);

      expect(result.body).toMatchObject(exampleAction);
      expect(result.status).toBe(200);

      mocks.reset();
    });


    it('should return an decline reason when action status is DECLINED', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const mocks = await new MockBuilder()
        .mockDomainUser(testData.baseUsers.accessor)
        .build(em);

      const expected = {
        id: randomUUID(),
        displayId: 'UC01',
        status: InnovationActionStatusEnum.DECLINED,
        section: InnovationSectionEnum.IMPLEMENTATION_PLAN,
        description: "description 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: { name: "name 1", role: ServiceRoleEnum.ACCESSOR },
        createdBy: { id: randomUUID(), name: "name 1", role: ServiceRoleEnum.ACCESSOR, organisationUnit: { id: randomUUID(), name: "NHS Innovation Service", acronym: "NHS-IS" } },
        declineReason: "this was rejected"
      }

      jest.spyOn(InnovationActionsService.prototype, 'getActionInfo').mockResolvedValue(expected as any);

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions/:actionId')
        .setContext()
        .setParams({ innovationId: testData.innovation.id, actionId: expected.id })
        .setMethod('GET')
        .setAuth(testData.domainContexts.accessor)
        .invoke<{ status: number, body: ResponseDTO }>(v1InnovationActionInfo);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);

      mocks.reset();
    });
  });


  describe('400', () => {
    it('should return error when no required params are passed', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions/:actionId')
        .setContext()
        .setMethod('GET')
        .setAuth(testData.domainContexts.accessor)
        .invoke<{ status: number, body: { error: GenericErrorsEnum, message: string, details: ErrorDetailsType[] } }>(v1InnovationActionInfo);

      expect(result.body.error).toMatch(GenericErrorsEnum.INVALID_PAYLOAD);
      expect(result.body.message).toMatch('Invalid request');
      expect(result.status).toBe(400);

    });

    it('should return error when innovationId param is not passed', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions/:actionId')
        .setContext()
        .setParams({ actionId: randomUUID() })
        .setMethod('GET')
        .setAuth(testData.domainContexts.accessor)
        .invoke<{ status: number, body: { error: GenericErrorsEnum, message: string, details: ErrorDetailsType[] } }>(v1InnovationActionInfo);

      expect(result.body.error).toMatch(GenericErrorsEnum.INVALID_PAYLOAD);
      expect(result.body.message).toMatch('Invalid request');
      expect(result.body.details[0]).toMatchObject({
        context: {},
        key: 'innovationId',
        message: '\"innovationId\" is required',
        type: 'any.required',
      });
      expect(result.status).toBe(400);

    });


    it('should return error when actionId param is not passed', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions/:actionId')
        .setContext()
        .setParams({ innovationId: testData.innovation.id })
        .setMethod('GET')
        .setAuth(testData.domainContexts.accessor)
        .invoke<{ status: number, body: { error: GenericErrorsEnum, message: string, details: ErrorDetailsType[] } }>(v1InnovationActionInfo);

      expect(result.body.error).toMatch(GenericErrorsEnum.INVALID_PAYLOAD);
      expect(result.body.message).toMatch('Invalid request');
      expect(result.body.details[0]).toMatchObject({
        context: {},
        key: 'actionId',
        message: '"actionId" is required',
        type: 'any.required',
      });
      expect(result.status).toBe(400);

    });

  });


  describe('Access', () => {

    it.each([
      [ServiceRoleEnum.ADMIN, 200],
      [ServiceRoleEnum.ACCESSOR, 200],
      [ServiceRoleEnum.ASSESSMENT, 200],
      [ServiceRoleEnum.INNOVATOR, 200],
    ])(('access with user %s should give %i'), async (userType: ServiceRoleEnum, status: number) => {

      const [user, context] = TestsHelper.getUser(userType);

      const httpTestBuilder = new HttpTestBuilder();

      const mocks = await new MockBuilder()
        .mockDomainUser(user!)
        .build(em);

      jest.spyOn(InnovationActionsService.prototype, 'getActionInfo').mockResolvedValue(exampleAction as any);

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/actions/:actionId')
        .setContext()
        .setParams({ innovationId: testData.innovation.id, actionId: exampleAction.id })
        .setMethod('GET')
        .setAuth(context!)
        .invoke<{ status: number }>(v1InnovationActionInfo);

      expect(result.status).toBe(status);

      mocks.reset();
    })

  });

});

