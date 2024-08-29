import { NewAnnouncementHandler } from './new-announcement.handler';

//import { randPastDate, randText, randUrl, randUuid } from '@ngneat/falso';
//import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
//import { AnnouncementEntity } from '@notifications/shared/entities';

//import type { EntityManager } from 'typeorm';
import { testEmails } from '../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { randUuid } from '@ngneat/falso';

describe('Notifications / _handlers / new announcement suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const requestUser = scenario.users.allMighty;

  //let em: EntityManager;

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(async () => {
    //em = await testsHelper.getQueryRunnerEntityManager();
  });

  describe('AP10_NEW_ANNOUNCEMENT', () => {
    it('should send an email to As and QAs that will be targeted by the announcement', async () => {
      // const announcement = await em.getRepository(AnnouncementEntity).save({
      //   title: randText({ charCount: 10 }),
      //   userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
      //   params: { content: randText(), link: { url: randUrl() } },
      //   startsAt: randPastDate(),
      //   expiresAt: null
      // });

      await testEmails(NewAnnouncementHandler, 'AP10_NEW_ANNOUNCEMENT', {
        inputData: { announcementId: randUuid() }, //announcement.id
        notificationPreferenceType: 'ADMIN',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.lisaQualifyingAccessor)],
        outputData: {
          announcement_title: '', //announcement.title,
          announcement_body: '', //announcement.params.content,
          announcement_url: '' //announcement.params.link.url
        }
      });
    });

    // it('should not send an email to As and QAs that will be targeted by the announcement', async () => {
    //   const announcement = await em.getRepository(AnnouncementEntity).save({
    //     title: randText({ charCount: 10 }),
    //     userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
    //     params: { content: randText(), link: { url: randUrl() } },
    //     startsAt: randPastDate(),
    //     expiresAt: null
    //   });

    //   await testEmails(NewAnnouncementHandler, 'AP10_NEW_ANNOUNCEMENT', {
    //     inputData: { announcementId: announcement.id },
    //     notificationPreferenceType: 'ADMIN',
    //     requestUser: DTOsHelper.getUserRequestContext(requestUser),
    //     recipients: [DTOsHelper.getRecipientUser(scenario.users.lisaQualifyingAccessor)],
    //     outputData: {
    //       announcement_title: announcement.title,
    //       announcement_body: announcement.params.content,
    //       announcement_url: announcement.params.link.url
    //     }
    //   });
    // });
  });
});
