import azureFunction from '.';

import { AnnouncementStatusEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randFutureDate, randText, randUuid } from '@ngneat/falso';
import { pick } from 'lodash';
import { AnnouncementsService } from '../_services/announcements.service';

jest.mock('@admin/shared/decorators', () => ({
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
  count: 1,
  data: [
    {
      id: randUuid(),
      expiresAt: null,
      params: {},
      startsAt: randFutureDate(),
      status: AnnouncementStatusEnum.SCHEDULED,
      title: randText(),
      userRoles: [ServiceRoleEnum.ASSESSMENT]
    }
  ]
};
const mock = jest.spyOn(AnnouncementsService.prototype, 'getAnnouncementsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-announcement-list Suite', () => {
  describe('200', () => {
    it('should list the announcements', async () => {
      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<never>(azureFunction);

      expect(result.body).toStrictEqual({
        count: expected.count,
        data: expected.data.map(a => pick(a, ['id', 'title', 'startsAt', 'status', 'expiresAt']))
      });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
