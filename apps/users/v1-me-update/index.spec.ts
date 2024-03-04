import azureFunction from '.';

import { randBoolean, randFullName, randText, randUuid } from '@ngneat/falso';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import type { DefaultUserBodyType, InnovatorBodyType } from './validation.schemas';

jest.mock('@users/shared/decorators', () => ({
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

const expected = {
  id: randUuid()
};
const mock = jest.spyOn(UsersService.prototype, 'updateUserInfo').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-update Suite', () => {
  const defaultBody = {
    displayName: randFullName()
  };
  const innovatorBody = {
    displayName: randFullName(),
    contactByEmail: randBoolean(),
    contactByPhone: randBoolean(),
    contactDetails: randText(),
    contactByPhoneTimeframe: null,
    organisation: {
      id: scenario.users.johnInnovator.roles.innovatorRole.organisation?.id ?? randUuid(),
      isShadow: true
    },
    howDidYouFindUsAnswers: null
  };
  describe('200', () => {
    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor]
    ])('should update the user info displayName as %s', async (_label, user) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setBody<DefaultUserBodyType>(defaultBody)
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should update other fields as innovator', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setBody<InnovatorBodyType>({ ...innovatorBody, mobilePhone: '1234', howDidYouFindUsAnswers: {} })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor]
    ])("shouldn't update other fields as %s", async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setBody<InnovatorBodyType>({
          displayName: randFullName(),
          contactByEmail: randBoolean(),
          contactByPhone: randBoolean(),
          contactDetails: randText(),
          contactByPhoneTimeframe: null,
          organisation: {
            id: randUuid(),
            isShadow: true
          },
          howDidYouFindUsAnswers: {}
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.status).toBe(403);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setBody<DefaultUserBodyType>(role === 'Innovator' ? innovatorBody : defaultBody)
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
