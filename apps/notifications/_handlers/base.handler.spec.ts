import { EmailTypeEnum, container } from '../_config'; // inversify container

import { randUuid } from '@ngneat/falso';
import {
  EmailNotificationPreferenceEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { CompleteScenarioType, MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { cloneDeep } from 'lodash';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';
import { BaseHandler } from './base.handler';

class TestHandler extends BaseHandler<any, any, any> {
  async run(): Promise<this> {
    console.log(container); // just for typescript to not complain about unused variable
    throw new Error('Method not implemented.');
  }
}

describe('Notifications / _handlers / base handler suite', () => {
  let testsHelper: NotificationsTestsHelper;
  let scenario: CompleteScenarioType;
  let baseHandler: BaseHandler<any, any, any>;

  beforeAll(async () => {
    testsHelper = await new NotificationsTestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
    baseHandler = new TestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {},
      MocksHelper.mockContext()
    );
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('isEmailPreferenceInstantly', () => {
    it('should return true when the email preference is instant', () => {
      expect(
        baseHandler['isEmailPreferenceInstantly']('ACTION', { ACTION: EmailNotificationPreferenceEnum.INSTANTLY })
      ).toBe(true);
    });

    it.each([[EmailNotificationPreferenceEnum.DAILY], [EmailNotificationPreferenceEnum.NEVER]])(
      'should return false when the email preference is %s',
      (preference: EmailNotificationPreferenceEnum) => {
        expect(baseHandler['isEmailPreferenceInstantly']('ACTION', { ACTION: preference })).toBe(false);
      }
    );

    it('should return true when the email preference is not set', () => {
      expect(
        baseHandler['isEmailPreferenceInstantly']('ACTION', { MESSAGE: EmailNotificationPreferenceEnum.NEVER })
      ).toBe(true);
    });
  });

  describe('frontendBaseUrl', () => {
    it.each([
      [ServiceRoleEnum.ASSESSMENT, 'assessment'],
      [ServiceRoleEnum.ACCESSOR, 'accessor'],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, 'accessor'],
      [ServiceRoleEnum.INNOVATOR, 'innovator'],
      [ServiceRoleEnum.ADMIN, '']
    ])('should return the correct frontend base url for role %s', (role: ServiceRoleEnum, res: string) => {
      expect(baseHandler['frontendBaseUrl'](role)).toBe(res);
    });
  });

  describe('getEmails', () => {
    let defaultReply: any[];

    beforeAll(() => {
      defaultReply = [
        {
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          params: {},
          to: scenario.users.jamieMadroxAccessor.email
        },
        {
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          params: {},
          to: scenario.users.jamieMadroxAccessor.email
        },
        {
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          params: {},
          to: scenario.users.paulNeedsAssessor.email
        }
      ];
    });

    beforeEach(() => {
      // Defaults for tests
      jest.spyOn(baseHandler['recipientsService'], 'getEmailPreferences').mockResolvedValue(new Map());

      // Defaults for tests
      baseHandler.emails = [
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole')
        },
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'regularRole')
        },
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole')
        }
      ];
    });

    it('should remove duplicate roles for resolution', async () => {
      baseHandler.emails = [
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole')
        },
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole')
        },
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole')
        }
      ];

      await baseHandler.getEmails();
      expect(baseHandler['recipientsService'].getEmailPreferences).toHaveBeenCalledWith([
        scenario.users.ingridAccessor.roles.accessorRole.id,
        scenario.users.paulNeedsAssessor.roles.assessmentRole.id
      ]);
    });

    it('should remove duplicate identities for resolution', async () => {
      await baseHandler.getEmails();
      expect(baseHandler['recipientsService'].usersIdentityInfo).toHaveBeenCalledWith([
        scenario.users.jamieMadroxAccessor.identityId,
        scenario.users.paulNeedsAssessor.identityId
      ]);
    });

    it('should send email to email recipient', async () => {
      baseHandler.emails = [
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: { email: 'test@example.org' }
        }
      ];

      const res = await baseHandler.getEmails();
      expect(res).toHaveLength(1);
      expect(res).toMatchObject([
        {
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          params: {},
          to: 'test@example.org'
        }
      ]);
    });

    it('should send email to user recipient', async () => {
      const res = await baseHandler.getEmails();
      expect(res).toHaveLength(3);
      expect(res).toMatchObject(defaultReply);
    });

    it('should not send email to inactive user recipient', async () => {
      const disabledJamie = cloneDeep(DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole'));
      disabledJamie.isActive = false;

      baseHandler.emails[0]!.to = disabledJamie;
      const res = await baseHandler.getEmails();
      expect(res).toHaveLength(2);
      expect(res).toMatchObject(defaultReply.slice(1));
    });

    it.each([
      ['should send', EmailNotificationPreferenceEnum.INSTANTLY, true],
      ['should send', undefined, true],
      ['should not send', EmailNotificationPreferenceEnum.DAILY, false],
      ['should not send', EmailNotificationPreferenceEnum.NEVER, false]
    ])('%s email to user recipient if preference is %s', async (_label, preference, result) => {
      jest
        .spyOn(baseHandler['recipientsService'], 'getEmailPreferences')
        .mockResolvedValueOnce(new Map([[scenario.users.jamieMadroxAccessor.roles.aiRole.id, { ACTION: preference }]]));

      expect(await baseHandler.getEmails()).toHaveLength(result ? 3 : 2);
    });

    it.each([
      [EmailNotificationPreferenceEnum.INSTANTLY],
      [undefined],
      [EmailNotificationPreferenceEnum.DAILY],
      [EmailNotificationPreferenceEnum.NEVER]
    ])(
      'should always send email to user recipient regardless of preference being %s if ignore preference is set',
      async preference => {
        jest
          .spyOn(baseHandler['recipientsService'], 'getEmailPreferences')
          .mockResolvedValueOnce(
            new Map([[scenario.users.jamieMadroxAccessor.roles.aiRole.id, { ACTION: preference }]])
          );

        baseHandler.emails.forEach(email => (email.options = { ignorePreferences: true }));
        expect(await baseHandler.getEmails()).toHaveLength(3);
      }
    );

    it('should send email to user recipient if locked and include locked is set', async () => {
      const disabledJamie = cloneDeep(DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole'));
      disabledJamie.isActive = false;

      baseHandler.emails[0]!.to = disabledJamie;
      baseHandler.emails.forEach(email => (email.options = { includeLocked: true }));
      const res = await baseHandler.getEmails();
      expect(res).toHaveLength(3);
      expect(res).toMatchObject(defaultReply);
    });

    it('should skip users it failed to get email', async () => {
      const unknownJamie = cloneDeep(DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole'));
      unknownJamie.identityId = randUuid();

      baseHandler.emails[0]!.to = unknownJamie;
      baseHandler.emails.forEach(email => (email.options = { includeLocked: true }));
      const res = await baseHandler.getEmails();
      expect(res).toHaveLength(2);
      expect(res).toMatchObject(defaultReply.slice(1));
    });

    it('should add display name to params if not previously provided', async () => {
      const res = await baseHandler.getEmails();
      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        { params: { display_name: scenario.users.jamieMadroxAccessor.name } },
        { params: { display_name: scenario.users.jamieMadroxAccessor.name } },
        { params: { display_name: scenario.users.paulNeedsAssessor.name } }
      ]);
    });

    it('should include display name for email recipient if provided', async () => {
      baseHandler.emails = [
        {
          notificationPreferenceType: 'ACTION',
          params: {},
          templateId: EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR,
          to: { email: 'test@example.org', displayname: 'Test User' }
        }
      ];
      const res = await baseHandler.getEmails();
      expect(res[0]?.params).toMatchObject({ display_name: 'Test User' });
    });
  });

  describe('getInApp', () => {
    it('should return the inApp recipients', () => {
      const example = [
        {
          context: {
            type: NotificationContextTypeEnum.ACTION,
            detail: NotificationContextDetailEnum.ACTION_CREATION,
            id: randUuid()
          },
          innovationId: randUuid(),
          params: {},
          userRoleIds: [randUuid(), randUuid()]
        }
      ];
      baseHandler.inApp = example;
      expect(baseHandler.getInApp()).toBe(example); // identity test actually
      expect(baseHandler.getInApp()).toMatchObject(example); // value test
    });
  });
});