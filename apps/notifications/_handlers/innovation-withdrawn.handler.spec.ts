import { CompleteScenarioType, MocksHelper, TestsHelper } from "@notifications/shared/tests";
import { InnovationWithdrawnHandler } from "./innovation-withdrawn.handler";
import { RecipientsService } from "../_services/recipients.service";
import { DTOsHelper } from "@notifications/shared/tests/helpers/dtos.helper";
import { EmailTypeEnum } from "../_config";
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from "@notifications/shared/enums";

describe('Notifications / _handlers / innovation-withdrawn handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationWithdrawnHandler;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    jest.spyOn(RecipientsService.prototype, 'usersBagToRecipients').mockResolvedValueOnce([
      DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole'),
      DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
    ]);

    handler = new InnovationWithdrawnHandler(
      DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
      {
        innovation: {
          id: innovation.id,
          name: innovation.name,
          affectedUsers: [
            {
              userId: scenario.users.jamieMadroxAccessor.id,
              userType: scenario.users.jamieMadroxAccessor.roles.aiRole.role,
              organisationId: scenario.users.jamieMadroxAccessor.roles.aiRole.organisation?.id,
              organisationUnitId: scenario.users.jamieMadroxAccessor.roles.aiRole.organisationUnit?.id
            },
            {
              userId: scenario.users.jamieMadroxAccessor.id,
              userType: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.role,
              organisationId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.organisation?.id,
              organisationUnitId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.organisationUnit?.id
            }
          ]
        }
      },
      MocksHelper.mockContext()
    )

    await handler.run();
  });

  it('Should send email to all affectedUsers without duplicate emails', () => {
    expect(handler.emails).toMatchObject([{
        templateId: EmailTypeEnum.INNOVATION_WITHDRAWN_TO_ASSIGNED_USERS,
        notificationPreferenceType: 'SUPPORT',
        to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        params: {
          innovation_name: innovation.name 
        }
    }])
  })

  it('Should inApp to all affectedUsers roles', () => {
    expect(handler.inApp).toMatchObject([{
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_WITHDRAWN,
          id: innovation.id 
        },
        userRoleIds: [scenario.users.jamieMadroxAccessor.roles.aiRole.id, scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id],
        params: {
          innovationName: innovation.name 
        }
    }])
  })
})