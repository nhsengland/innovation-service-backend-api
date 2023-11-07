import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails } from '../../_helpers/tests.helper';
import { dataSharingPreferencesUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { UnitInactivatedHandler } from './unit-inactivated.handler';

describe('Notifications / _handlers / lock-user suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.allMighty;

  describe('AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS', () => {
    const inactivatedUnit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;
    const completedInnovation = [
      scenario.users.johnInnovator.innovations.johnInnovation,
      scenario.users.adamInnovator.innovations.adamInnovation
    ];
    it('should send an email to the innovation owners of the innovations that were completed', async () => {
      await testEmails(UnitInactivatedHandler, 'AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS', {
        inputData: { unitId: inactivatedUnit.id, completedInnovationIds: completedInnovation.map(i => i.id) },
        notificationPreferenceType: NotificationCategoryEnum.ADMIN,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.adamInnovator)
        ],
        outputData: completedInnovation.map(i => ({
          innovation_name: i.name,
          unit_name: inactivatedUnit.name,
          support_url: dataSharingPreferencesUrl(ServiceRoleEnum.INNOVATOR, i.id)
        }))
      });
    });

    it('should send an in-app to the innovation owners of the innovations that were completed', async () => {
      const handler = new UnitInactivatedHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        { unitId: inactivatedUnit.id, completedInnovationIds: completedInnovation.map(i => i.id) },
        MocksHelper.mockContext()
      );
      await handler.run();

      expect(handler.inApp).toMatchObject(
        completedInnovation.map((inno, i) => ({
          innovationId: inno.id,
          context: {
            type: NotificationCategoryEnum.ADMIN,
            detail: 'AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS',
            id: inno.id
          },
          userRoleIds: !i
            ? [scenario.users.johnInnovator.roles.innovatorRole.id]
            : [scenario.users.adamInnovator.roles.innovatorRole.id],
          params: {
            unitName: inactivatedUnit.name,
            innovationName: inno.name
          }
        }))
      );
    });
  });
});
