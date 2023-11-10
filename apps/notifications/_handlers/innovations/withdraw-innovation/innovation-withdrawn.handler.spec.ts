import { NotificationCategoryEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { container } from '../../../_config/';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { RecipientsService } from '../../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { InnovationWithdrawnHandler } from './innovation-withdrawn.handler';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / innovation-withdrawn suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const users = [
    scenario.users.johnInnovator,
    scenario.users.janeInnovator,
    scenario.users.aliceQualifyingAccessor,
    scenario.users.bartQualifyingAccessor
  ];

  beforeAll(async () => {
    await testsHelper.init();
    jest
      .spyOn(RecipientsService.prototype, 'usersBagToRecipients')
      .mockResolvedValue(users.map(u => DTOsHelper.getRecipientUser(u)));
  });

  const requestUser = scenario.users.johnInnovator;
  const innovation = requestUser.innovations.johnInnovation;

  describe('AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS', () => {
    const inputData = {
      innovation: {
        id: innovation.id,
        name: innovation.name,
        affectedUsers: [
          {
            userId: scenario.users.johnInnovator.id,
            userType: scenario.users.johnInnovator.roles.innovatorRole.role
          },
          {
            userId: scenario.users.janeInnovator.id,
            userType: scenario.users.janeInnovator.roles.innovatorRole.role
          },
          {
            userId: scenario.users.aliceQualifyingAccessor.id,
            userType: scenario.users.aliceQualifyingAccessor.roles.qaRole.role,
            organisationId: scenario.users.aliceQualifyingAccessor.roles.qaRole.organisation?.id,
            organisationUnitId: scenario.users.aliceQualifyingAccessor.roles.qaRole.organisationUnit?.id
          },
          {
            userId: scenario.users.bartQualifyingAccessor.id,
            userType: scenario.users.bartQualifyingAccessor.roles.qaRole.role,
            organisationId: scenario.users.bartQualifyingAccessor.roles.qaRole.organisation?.id,
            organisationUnitId: scenario.users.bartQualifyingAccessor.roles.qaRole.organisationUnit?.id
          }
        ]
      }
    };

    it('should send an email to the affected users', async () => {
      await testEmails(InnovationWithdrawnHandler, 'WI01_INNOVATION_WITHDRAWN', {
        notificationPreferenceType: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: users.map(u => DTOsHelper.getRecipientUser(u)),
        inputData: inputData,
        outputData: { innovation_name: innovation.name }
      });
    });

    it('should send an in-app to the affected users', async () => {
      await testInApps(InnovationWithdrawnHandler, 'WI01_INNOVATION_WITHDRAWN', {
        context: { id: innovation.id, type: NotificationCategoryEnum.INNOVATION_MANAGEMENT },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: users.map(u => DTOsHelper.getRecipientUser(u)),
        inputData: inputData,
        outputData: { innovationName: innovation.name }
      });
    });
  });
});
