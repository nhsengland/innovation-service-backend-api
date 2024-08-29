import { container } from '../../_config/';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { NewAnnouncementHandler } from './new-announcement.handler';
import { testEmails } from '../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { randPastDate, randText, randUrl } from '@ngneat/falso';
import { ServiceRoleEnum, SimpleAnnouncementType } from '@notifications/shared/enums';
import { AnnouncementEntity } from '@notifications/shared/entities';
import type { EntityManager } from 'typeorm';
import { RecipientsService } from '../../_services/recipients.service';
import { HandlersHelper } from '../../_helpers/handlers.helper';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / new announcement suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const requestUser = scenario.users.allMighty;
  let announcement: AnnouncementEntity;

  let em: EntityManager;

  let announcementInfo: SimpleAnnouncementType;

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
    announcement = await em.getRepository(AnnouncementEntity).save({
      title: randText({ charCount: 10 }),
      userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.INNOVATOR],
      params: { content: randText(), link: { label: randText(), url: randUrl() } },
      startsAt: randPastDate(),
      expiresAt: null
    });
    announcementInfo = {
      id: announcement.id,
      title: announcement.title,
      params: {
        content: announcement.params?.content || '',
        link: { label: announcement.params?.link?.label || '', url: announcement.params?.link?.url || '' }
      }
    };
    jest.spyOn(RecipientsService.prototype, 'getAnnouncementInfo').mockResolvedValue(announcementInfo);
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('AP10_NEW_ANNOUNCEMENT', () => {
    beforeEach(async () => {
      const recipients = [scenario.users.lisaQualifyingAccessor.id];

      jest.spyOn(RecipientsService.prototype, 'getAnnouncementUsers').mockResolvedValue(recipients);
    });
    it('should send an email a QA that will be targeted by the announcement', async () => {
      await testEmails(NewAnnouncementHandler, 'AP10_NEW_ANNOUNCEMENT', {
        inputData: { announcementId: announcement.id },
        notificationPreferenceType: 'ANNOUNCEMENTS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.lisaQualifyingAccessor)],
        outputData: {
          announcement_title: announcement.title,
          announcement_body: announcement.params?.content || '',
          announcement_url: `[${announcement.params?.link?.label}](${announcement.params?.link?.url})`
        }
      });
    });
  });

  describe('AP11_NEW_ANNOUNCEMENT_WITH_INNOVATIONS_NAME', () => {
    beforeEach(async () => {
      const recipientsWithInnovations = new Map<string, string[]>([
        [scenario.users.johnInnovator.id, [scenario.users.johnInnovator.innovations.johnInnovation.name]]
      ]);

      jest
        .spyOn(RecipientsService.prototype, 'getAnnouncementUsersWithInnovationsNames')
        .mockResolvedValue(recipientsWithInnovations);
    });
    it('should send an email to specific innovators with innovations targeted by the announcement', async () => {
      await testEmails(NewAnnouncementHandler, 'AP11_NEW_ANNOUNCEMENT_WITH_INNOVATIONS_NAME', {
        inputData: { announcementId: announcement.id },
        notificationPreferenceType: 'ANNOUNCEMENTS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        outputData: {
          announcement_title: announcement.title,
          announcement_body: announcement.params?.content || '',
          innovations_name: HandlersHelper.formatStringArray([
            scenario.users.johnInnovator.innovations.johnInnovation.name
          ]),
          announcement_url: `[${announcement.params?.link?.label}](${announcement.params?.link?.url})`
        }
      });
    });
  });
});
