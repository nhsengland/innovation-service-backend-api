import { NeedsAssessmentStartedHandler } from './needs-assessment-started.handler';

import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';

describe('Notifications / _handlers / needs-assessment-started handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];
  let assessment: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['assessment'];

  let handler: NeedsAssessmentStartedHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;
    assessment = innovation.assessment;
  });

  // beforeEach(() => {
  //   jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
  //     name: innovation.name,
  //     ownerId: innovationOwner.id,
  //     ownerIdentityId: innovationOwner.identityId
  //   });
  // });

  describe('Innovation owner is active', () => {
    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner));

      handler = new NeedsAssessmentStartedHandler(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        {
          innovationId: innovation.id,
          assessmentId: assessment.id,
          threadId: innovation.threads.threadByPaulNA.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send email to innovation owner', () => {
      const expectedEmail = handler.emails.find(
        email => email.templateId === EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR
      );

      expect(expectedEmail).toMatchObject({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
        to: DTOsHelper.getRecipientUser(innovationOwner),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          message_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              innovationId: innovation.id,
              threadId: innovation.threads.threadByPaulNA.id
            })
            .buildUrl()
        }
      });
    });

    it('Should send inApp to innovation owner', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(innovationOwner.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
          detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_STARTED,
          id: assessment.id
        },
        userRoleIds: [innovationOwner.roles.innovatorRole.id],
        params: {}
      });
    });
  });

  describe('Innovation owner is not active', () => {
    beforeAll(async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce({ ...DTOsHelper.getRecipientUser(innovationOwner), isActive: false });

      handler = new NeedsAssessmentStartedHandler(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        {
          innovationId: innovation.id,
          assessmentId: assessment.id,
          threadId: innovation.threads.threadByPaulNA.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should not send any email', () => {
      expect(handler.emails).toHaveLength(0);
    });

    it('Should not send inApp to innovation owner', () => {
      expect(handler.inApp).toHaveLength(0);
    });
  });
});
