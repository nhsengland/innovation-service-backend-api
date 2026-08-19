import azureFunction from '.';

import { randBoolean, randFirstName, randLastName, randText, randUuid } from '@ngneat/falso';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import {
  DefaultUserBodySchema,
  type DefaultUserBodyType,
  InnovatorBodySchema,
  type InnovatorBodyType
} from './validation.schemas';

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
  const givenName = randFirstName();
  const surname = randLastName();

  const defaultBody = {
    givenName: givenName,
    surname: surname
  };

  const innovatorBody = {
    givenName: givenName,
    surname: surname,
    contactByEmail: randBoolean(),
    contactByPhone: randBoolean(),
    contactDetails: randText(),
    contactByPhoneTimeframe: null,
    organisation: {
      id: scenario.users.johnInnovator.roles.innovatorRole.organisation?.id ?? randUuid(),
      isShadow: true
    },
    howDidYouFindUsAnswers: {}
  };

  describe.each([
    ['default user', DefaultUserBodySchema, defaultBody],
    ['innovator', InnovatorBodySchema, innovatorBody]
  ])('%s name validation', (_label, schema, body) => {
    it('accepts and trims normal names', () => {
      const result = schema.validate({ ...body, givenName: ' Ada ', surname: ' Lovelace ' });

      expect(result.error).toBeUndefined();
      expect(result.value).toMatchObject({ givenName: 'Ada', surname: 'Lovelace' });
    });

    it.each([
      ['givenName', '   ', 'Lovelace'],
      ['surname', 'Ada', '   ']
    ])('rejects whitespace-only %s', (_field, invalidGivenName, invalidSurname) => {
      const result = schema.validate({ ...body, givenName: invalidGivenName, surname: invalidSurname });

      expect(result.error).toBeDefined();
    });

    it('accepts 64-character givenName and surname', () => {
      const result = schema.validate({ ...body, givenName: 'a'.repeat(64), surname: 'b'.repeat(64) });

      expect(result.error).toBeUndefined();
    });

    it.each([
      ['givenName', 'a'.repeat(65), 'Lovelace'],
      ['surname', 'Ada', 'b'.repeat(65)]
    ])('rejects a 65-character %s', (_field, invalidGivenName, invalidSurname) => {
      const result = schema.validate({ ...body, givenName: invalidGivenName, surname: invalidSurname });

      expect(result.error).toBeDefined();
    });
  });

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
          givenName: givenName,
          surname: surname,
          // displayName: displayName,
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
