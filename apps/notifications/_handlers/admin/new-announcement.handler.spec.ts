import { container } from '../../_config/';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { NewAnnouncementHandler } from './new-announcement.handler';
import { testEmails } from '../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { randText, randUrl, randUuid } from '@ngneat/falso';
import type { SimpleAnnouncementType } from '@notifications/shared/enums';

import { RecipientsService } from '../../_services/recipients.service';
import { HandlersHelper } from '../../_helpers/handlers.helper';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / new announcement suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const requestUser = scenario.users.allMighty;

  const announcementInfo: SimpleAnnouncementType = {
    id: randUuid(),
    title: randText({ charCount: 10 }),
    params: {
      content: randText(),
      link: { label: randText(), url: randUrl() }
    }
  };
  jest.spyOn(RecipientsService.prototype, 'getAnnouncementInfo').mockResolvedValue(announcementInfo);

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(async () => {});

  describe('AP10_NEW_ANNOUNCEMENT', () => {
    beforeEach(async () => {
      const recipients = [scenario.users.lisaQualifyingAccessor.id];

      jest.spyOn(RecipientsService.prototype, 'getAnnouncementUsers').mockResolvedValue(recipients);
    });
    it('should send an email a QA that will be targeted by the announcement', async () => {
      await testEmails(NewAnnouncementHandler, 'AP10_NEW_ANNOUNCEMENT', {
        inputData: { announcementId: announcementInfo.id },
        notificationPreferenceType: 'ANNOUNCEMENTS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.lisaQualifyingAccessor)],
        outputData: {
          announcement_title: announcementInfo.title,
          announcement_body: announcementInfo.params?.content || '',
          announcement_url: announcementInfo.params.link
            ? `[${announcementInfo.params.link.label}](${announcementInfo.params.link.url})`
            : ''
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
        inputData: { announcementId: announcementInfo.id },
        notificationPreferenceType: 'ANNOUNCEMENTS',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        outputData: {
          announcement_title: announcementInfo.title,
          announcement_body: announcementInfo.params?.content || '',
          innovations_name: HandlersHelper.formatStringArray([
            scenario.users.johnInnovator.innovations.johnInnovation.name
          ]),
          announcement_url: announcementInfo.params.link
            ? `[${announcementInfo.params.link.label}](${announcementInfo.params.link.url})`
            : ''
        }
      });
    });
  });
});
