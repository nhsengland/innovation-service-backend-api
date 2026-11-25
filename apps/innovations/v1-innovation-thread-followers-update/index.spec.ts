import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randUuid } from '@ngneat/falso';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import type { BodyType, ParamsType } from './validation.schemas';

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

const mock = jest.spyOn(InnovationThreadsService.prototype, 'addFollowersToThread').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-thread-followers-update', () => {
  describe('204', () => {
    it('should update the followers of an innovation thread', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid()
        })
        .setBody<BodyType>({
          followerUserRoleIds: [scenario.users.aliceQualifyingAccessor.roles.qaRole.id]
        })
        .call<never>(azureFunction);

      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 204, scenario.users.aliceQualifyingAccessor],
      ['A', 204, scenario.users.ingridAccessor],
      ['NA', 204, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 204, scenario.users.johnInnovator],
      ['Innovator collaborator', 204, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid()
        })
        .setBody<BodyType>({
          followerUserRoleIds: [scenario.users.aliceQualifyingAccessor.roles.qaRole.id]
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });

    it.each([
      ['QA', 409, scenario.users.aliceQualifyingAccessor],
      ['A', 409, scenario.users.ingridAccessor],
      ['NA', 409, scenario.users.paulNeedsAssessor]
    ])(
      'access with user %s should give conflict on add followers',
      async (_role: string, status: number, user: TestUserType) => {
        const result = await new AzureHttpTriggerBuilder()
          .setAuth(user)
          .setParams<ParamsType>({
            innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
            threadId: randUuid()
          })
          .setBody<BodyType>({
            followerUserRoleIds: [scenario.users.aliceQualifyingAccessor.roles.qaRole.id]
          })
          .call<ErrorResponseType>(azureFunction);

        expect(result.status).toBe(status);
      }
    );
  });
});
