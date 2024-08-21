import azureFunction from '.';

import { AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randFutureDate, randText, randUuid } from '@ngneat/falso';
import { AnnouncementsService } from '../_services/announcements.service';
import type { BodyType, ParamsType } from './validation.schemas';

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

const mock = jest.spyOn(AnnouncementsService.prototype, 'updateAnnouncement').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-announcement-update Suite', () => {
  describe('204', () => {
    it('should update the announcement', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams<ParamsType>({ announcementId: randUuid() })
        .setBody<BodyType>({
          title: randText(),
          startsAt: randFutureDate(),
          userRoles: [ServiceRoleEnum.ACCESSOR],
          params: { content: randText() },
          type: AnnouncementTypeEnum.LOG_IN
        })
        .call<never>(azureFunction);

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 204, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['A', 403, scenario.users.ingridAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 403, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ announcementId: randUuid() })
        .setBody<BodyType>({
          title: randText(),
          startsAt: randFutureDate(),
          userRoles: [ServiceRoleEnum.ACCESSOR],
          params: { content: randText() },
          type: AnnouncementTypeEnum.LOG_IN
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
