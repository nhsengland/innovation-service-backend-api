import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import type { ResponseDTO } from './transformation.dtos';
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

const expected = { id: randUuid() };
const mock = jest.spyOn(InnovationThreadsService.prototype, 'updateThreadMessage').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-thread-message-update Suite', () => {
  describe('200', () => {
    it('should update an innovation thread message', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid(),
          messageId: randUuid()
        })
        .setBody<BodyType>({
          message: randText()
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator collaborator', 200, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid(),
          messageId: randUuid()
        })
        .setBody<BodyType>({
          message: randText()
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });

  it.each([
    ['QA', 409, scenario.users.aliceQualifyingAccessor],
    ['A', 409, scenario.users.ingridAccessor],
    ['NA', 409, scenario.users.paulNeedsAssessor],
    ['Innovator owner', 409, scenario.users.johnInnovator],
    ['Innovator collaborator', 409, scenario.users.janeInnovator]
  ])(
    'access with user %s should give conflict on update message',
    async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
          threadId: randUuid(),
          messageId: randUuid()
        })
        .setBody<BodyType>({
          message: randText()
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    }
  );
});
