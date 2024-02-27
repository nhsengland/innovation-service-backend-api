import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randUuid } from '@ngneat/falso';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import type { ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const mock = jest.spyOn(InnovationThreadsService.prototype, 'unfollowThread').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-thread-unfollow', () => {
  describe('204', () => {
    it('should unfollow an innovation thread', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid(),
          roleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('403', () => {
    it('should throw a ForbiddenError when the request user is unfollowing other users', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid(),
          roleId: scenario.users.jamieMadroxAccessor.roles.aiRole.id
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(403);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty, 'admin'],
      ['QA', 204, scenario.users.aliceQualifyingAccessor, 'qaRole'],
      ['A', 204, scenario.users.ingridAccessor, 'accessorRole'],
      ['NA', 204, scenario.users.paulNeedsAssessor, 'assessmentRole'],
      ['Innovator owner', 403, scenario.users.johnInnovator, 'innovatorRole'],
      ['Innovator collaborator', 403, scenario.users.janeInnovator, 'innovatorRole'],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator, 'innovatorRole']
    ])(
      'access with user %s should give %i',
      async (_role: string, status: number, user: TestUserType, role: string) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user)
          .setParams<ParamsType>({
            innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
            threadId: randUuid(),
            roleId: user.roles[role]!.id
          })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(status);
      }
    );

    it.each([
      ['QA', 409, scenario.users.aliceQualifyingAccessor, 'qaRole'],
      ['A', 409, scenario.users.ingridAccessor, 'accessorRole'],
      ['NA', 409, scenario.users.paulNeedsAssessor, 'assessmentRole']
    ])(
      'access with user %s should give conflict in the unfollow',
      async (_role: string, status: number, user: TestUserType, role: string) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user)
          .setParams<ParamsType>({
            innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
            threadId: randUuid(),
            roleId: user.roles[role]!.id
          })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(status);
      }
    );
  });
});
