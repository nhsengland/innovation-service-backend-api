import azureFunction from '.';

import { AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@admin/shared/tests';
import type { TestUserType } from '@admin/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@admin/shared/types';
import { randFutureDate, randText, randUuid } from '@ngneat/falso';
import { AnnouncementsService } from '../_services/announcements.service';
import type { BodyType } from './validation.schemas';

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

const expected = { id: randUuid() };
const mock = jest.spyOn(AnnouncementsService.prototype, 'createAnnouncement').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-announcement-create Suite', () => {
  describe('200', () => {
    it('should create a announcement', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setBody<BodyType>({
          params: { content: randText() },
          startsAt: randFutureDate(),
          title: randText(),
          userRoles: [ServiceRoleEnum.ASSESSMENT],
          type: AnnouncementTypeEnum.LOG_IN
        })
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should create a announcement with filters', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setBody<BodyType>({
          params: {},
          startsAt: randFutureDate(),
          title: randText(),
          userRoles: [ServiceRoleEnum.ASSESSMENT],
          filters: [
            {
              section: 'INNOVATION_DESCRIPTION',
              question: 'officeLocation',
              answers: ['England', 'Scotland', 'Wales', 'Northern Ireland']
            },
            {
              section: 'INNOVATION_DESCRIPTION',
              question: 'categories',
              answers: ['MEDICAL_DEVICE', 'MODELS_CARE', 'DATA_MONITORING']
            },
            {
              section: 'CURRENT_CARE_PATHWAY',
              question: 'hasMarketResearch',
              answers: ['YES']
            }
          ]
        })
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(expected);
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
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setBody<BodyType>({
          params: { content: randText() },
          startsAt: randFutureDate(),
          title: randText(),
          userRoles: [ServiceRoleEnum.ASSESSMENT],
          type: AnnouncementTypeEnum.LOG_IN
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
