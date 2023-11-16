import { randUuid } from '@ngneat/falso';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { NeedsAssessmentAssessorUpdateHandler } from './needs-assessment-assessor-update.handler';

describe('Notifications / _handlers / needs assessment assessors update suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  describe('when needs assessor changes', () => {
    const inputData = {
      assessmentId: randUuid(),
      innovationId: innovation.id,
      previousAssessor: { id: scenario.users.paulNeedsAssessor.id },
      newAssessor: { id: scenario.users.seanNeedsAssessor.id }
    };

    describe('NA06_NEEDS_ASSESSOR_REMOVED', () => {
      it('should send an email to the previous assessor', async () => {
        await testEmails(NeedsAssessmentAssessorUpdateHandler, 'NA06_NEEDS_ASSESSOR_REMOVED', {
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          inputData: inputData,
          outputData: {
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id)
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)]
        });
      });

      it('should send an inapp to the previous assessor', async () => {
        await testInApps(NeedsAssessmentAssessorUpdateHandler, 'NA06_NEEDS_ASSESSOR_REMOVED', {
          innovationId: innovation.id,
          context: {
            type: 'NEEDS_ASSESSMENT',
            id: inputData.assessmentId
          },
          inputData: inputData,
          outputData: {
            innovationName: innovation.name
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)]
        });
      });

      it('should skip if no previous assessor', async () => {
        const handler = new NeedsAssessmentAssessorUpdateHandler(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          {
            ...inputData,
            previousAssessor: undefined
          },
          MocksHelper.mockContext()
        );

        await handler.run();

        expect(handler.emails.filter(e => e.templateId === 'NA06_NEEDS_ASSESSOR_REMOVED')).toEqual([]);
        expect(handler.inApp.filter(a => a.context.detail === 'NA06_NEEDS_ASSESSOR_REMOVED')).toEqual([]);
      });
    });

    describe('NA07_NEEDS_ASSESSOR_ASSIGNED', () => {
      it('should send an email to the previous assessor', async () => {
        await testEmails(NeedsAssessmentAssessorUpdateHandler, 'NA07_NEEDS_ASSESSOR_ASSIGNED', {
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          inputData: inputData,
          outputData: {
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id)
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.seanNeedsAssessor)]
        });
      });

      it('should send an inapp to the previous assessor', async () => {
        await testInApps(NeedsAssessmentAssessorUpdateHandler, 'NA07_NEEDS_ASSESSOR_ASSIGNED', {
          innovationId: innovation.id,
          context: {
            type: 'NEEDS_ASSESSMENT',
            id: inputData.assessmentId
          },
          inputData: inputData,
          outputData: {
            innovationName: innovation.name
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: [DTOsHelper.getRecipientUser(scenario.users.seanNeedsAssessor)]
        });
      });
    });
  });
});
