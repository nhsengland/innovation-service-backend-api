import v1InnovationActionInfo from '.';

import { InnovationActionStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { GenericErrorsEnum } from '@innovations/shared/errors';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randomUUID } from 'crypto';
import { cloneDeep } from 'lodash';
import { InnovationActionsService } from '../_services/innovation-actions.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const exampleAction = {
  id: randomUUID(),
  displayId: 'UC01',
  status: InnovationActionStatusEnum.COMPLETED,
  section: 'INNOVATION_DESCRIPTION' as const,
  description: 'description 1',
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedBy: { name: 'name 1', role: ServiceRoleEnum.ACCESSOR },
  createdBy: {
    id: randomUUID(),
    name: 'name 1',
    role: ServiceRoleEnum.ACCESSOR,
    organisationUnit: { id: randomUUID(), name: 'NHS Innovation Service', acronym: 'NHS-IS' }
  }
};
const mock = jest.spyOn(InnovationActionsService.prototype, 'getActionInfo').mockResolvedValue(exampleAction);

afterEach(() => {
  mock.mockClear();
});

describe('v1-innovation-action-info Suite', () => {
  describe('200', () => {
    it('should return an action', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          actionId: exampleAction.id
        })
        .call<ResponseDTO>(v1InnovationActionInfo);

      expect(result.body).toMatchObject(exampleAction);
      expect(result.status).toBe(200);
    });

    it('should return an decline reason when action status is DECLINED', async () => {
      const expected = {
        id: randomUUID(),
        displayId: 'UC01',
        status: InnovationActionStatusEnum.DECLINED,
        section: 'IMPLEMENTATION_PLAN',
        description: 'description 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: { name: 'name 1', role: ServiceRoleEnum.ACCESSOR },
        createdBy: {
          id: randomUUID(),
          name: 'name 1',
          role: ServiceRoleEnum.ACCESSOR,
          organisationUnit: { id: randomUUID(), name: 'NHS Innovation Service', acronym: 'NHS-IS' }
        },
        declineReason: 'this was rejected'
      };

      mock.mockResolvedValueOnce(expected as any);

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          actionId: exampleAction.id
        })
        .call<ResponseDTO>(v1InnovationActionInfo);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
    });

    it('should return isOwner = true when updatedBy is the owner of the innovation', async () => {
      const mockRes = cloneDeep({ ...exampleAction, updatedBy: { ...exampleAction.updatedBy, isOwner: true } });
      mock.mockResolvedValueOnce(mockRes);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          actionId: mockRes.id
        })
        .call<ResponseDTO>(v1InnovationActionInfo);

      expect(result.body).toMatchObject(mockRes);
      expect(result.status).toBe(200);
    });
  });

  describe('400', () => {
    it('should return error when no required params are passed', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<any>({})
        .call<ErrorResponseType>(v1InnovationActionInfo);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request'
      });
      expect(result.status).toBe(400);
    });

    it('should return error when innovationId param is not passed', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<any>({ actionId: randomUUID() })
        .call<ErrorResponseType>(v1InnovationActionInfo);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request',
        details: [
          {
            context: {},
            key: 'innovationId',
            message: '"innovationId" is required',
            type: 'any.required'
          }
        ]
      });
      expect(result.status).toBe(400);
    });

    it('should return error when actionId param is not passed', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<any>({ innovationId: randomUUID() })
        .call<ErrorResponseType>(v1InnovationActionInfo);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request',
        details: [
          {
            context: {},
            key: 'actionId',
            message: '"actionId" is required',
            type: 'any.required'
          }
        ]
      });
      expect(result.status).toBe(400);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          actionId: exampleAction.id
        })
        .call<ResponseDTO>(v1InnovationActionInfo);

      expect(result.status).toBe(status);
    });
  });
});
