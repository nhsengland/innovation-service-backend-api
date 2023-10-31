import { DocumentUploadHandler } from './document-upload.handler';

import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { CompleteScenarioType, MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';

import { TranslationHelper } from '@notifications/shared/helpers';
import { documentUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';

describe('Notifications / _handlers / document-upload suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('DC01_UPLOADED_DOCUMENT_TO_INNOVATOR', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    let handler: DocumentUploadHandler;

    describe('when a QA/A sends the notification', () => {
      const requestUser = scenario.users.aliceQualifyingAccessor;
      const file = innovation.files.innovationFileByAlice;

      beforeAll(async () => {
        handler = new DocumentUploadHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          { innovationId: innovation.id, file: { id: file.id } },
          MocksHelper.mockContext()
        );
        await handler.run();
      });

      it('should send an email to the innovators', async () => {
        expect(handler.emails).toHaveLength(2);
        expect(handler.emails).toEqual([
          {
            templateId: 'DC01_UPLOADED_DOCUMENT_TO_INNOVATOR',
            notificationPreferenceType: NotificationCategoryEnum.DOCUMENT,
            to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
            params: {
              accessor_name: requestUser.name,
              unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              document_url: documentUrl(ServiceRoleEnum.INNOVATOR, innovation.id, file.id)
            }
          },
          {
            templateId: 'DC01_UPLOADED_DOCUMENT_TO_INNOVATOR',
            notificationPreferenceType: NotificationCategoryEnum.DOCUMENT,
            to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
            params: {
              accessor_name: requestUser.name,
              unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              document_url: documentUrl(ServiceRoleEnum.INNOVATOR, innovation.id, file.id)
            }
          }
        ]);
      });

      it('should send an inapp to the innovators', async () => {
        expect(handler.inApp).toEqual([
          {
            innovationId: innovation.id,
            context: {
              type: NotificationCategoryEnum.DOCUMENT,
              detail: 'DC01_UPLOADED_DOCUMENT_TO_INNOVATOR',
              id: file.id
            },
            userRoleIds: [
              scenario.users.johnInnovator.roles.innovatorRole.id,
              scenario.users.janeInnovator.roles.innovatorRole.id
            ],
            params: {
              fileId: file.id,
              unitName: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name
            }
          }
        ]);
      });
    });

    describe('when a NA sends the notification', () => {
      const file = innovation.files.innovationFileByPaul;
      const requestUser = scenario.users.paulNeedsAssessor;

      it('should use NA team name on unit_name', async () => {
        handler = new DocumentUploadHandler(
          DTOsHelper.getUserRequestContext(requestUser),
          { innovationId: innovation.id, file: { id: file.id } },
          MocksHelper.mockContext()
        );
        await handler.run();

        expect(handler.emails[0]?.params.unit_name).toBe(TranslationHelper.translate('TEAMS.ASSESSMENT'));
        expect(handler.inApp[0]?.params.unitName).toBe(TranslationHelper.translate('TEAMS.ASSESSMENT'));
      });
    });
  });
});
