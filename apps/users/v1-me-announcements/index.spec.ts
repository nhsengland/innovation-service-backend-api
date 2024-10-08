import azureFunction from '.';

import { randFutureDate, randPastDate, randText, randUuid } from '@ngneat/falso';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import type { TestUserType } from '@users/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@users/shared/types';
import { AnnouncementsService } from '../_services/announcements.service';
import type { ResponseDTO } from './transformation.dtos';
import type { QueryParamsType } from './validation.schemas';
import { AnnouncementTypeEnum } from '@users/shared/enums';

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

const expected = [
  {
    id: randUuid(),
    title: randText(),
    startsAt: randPastDate(),
    expiresAt: randFutureDate(),
    params: null
  },
  {
    id: randUuid(),
    title: randText(),
    startsAt: randPastDate(),
    expiresAt: null,
    params: null
  }
];
const mock = jest.spyOn(AnnouncementsService.prototype, 'getUserRoleAnnouncements').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-me-announcements Suite', () => {
  describe('200', () => {
    it('should return the announcements', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setQuery<QueryParamsType>({ type: [AnnouncementTypeEnum.LOG_IN] })
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
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setQuery<QueryParamsType>({ type: [AnnouncementTypeEnum.LOG_IN] })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
