import { NeedsAssessmentAssessorUpdateHandler } from './needs-assessment-assessor-update.handler';

import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { RecipientsService } from '../_services/recipients.service';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';

describe('Notifications / _handlers / needs-assessment-started handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let previousAssessor: CompleteScenarioType['users']['paulNeedsAssessor'];
  let newAssessor: CompleteScenarioType['users']['seanNeedsAssessor'];

  let handler: NeedsAssessmentAssessorUpdateHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    previousAssessor = scenario.users.paulNeedsAssessor;
    newAssessor = scenario.users.seanNeedsAssessor;
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    });
  });

  it.each([
    ['previous assessor', EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA],
    ['new assessor', EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_NEW_NA]
  ])('Should send email to %s', async (_, templateId: EmailTypeEnum) => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(previousAssessor));
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(newAssessor));

    const recipientAssessor =
      templateId === EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA ? previousAssessor : newAssessor;

    handler = new NeedsAssessmentAssessorUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
      {
        innovationId: innovation.id,
        assessmentId: innovation.assessment.id,
        previousAssessor: { id: previousAssessor.id },
        newAssessor: { id: newAssessor.id }
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    const expectedEmail = handler.emails.find(email => email.templateId === templateId);
    expect(expectedEmail).toMatchObject({
      templateId,
      to: DTOsHelper.getRecipientUser(recipientAssessor),
      notificationPreferenceType: null,
      params: {
        innovation_name: innovation.name,
        innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('assessment/innovations/:innovationId')
          .setPathParams({ innovationId: innovation.id })
          .buildUrl()
      }
    });
  });

  it('Should not send emails if the assessors are not found', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(null);

    handler = new NeedsAssessmentAssessorUpdateHandler(
      DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
      {
        innovationId: innovation.id,
        assessmentId: innovation.assessment.id,
        previousAssessor: { id: previousAssessor.id },
        newAssessor: { id: newAssessor.id }
      },
      MocksHelper.mockContext()
    );
    
    await handler.run();

    expect(handler.emails).toHaveLength(0);
  })
});
