import { InnovationSubmittedHandler } from './innovation-submitted.handler';

import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';

describe('Notifications / _handlers / innovation-submitted suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.ottoOctaviusInnovator.innovations.powerSourceInnovation; // Waiting for needs assessment
  const naRecipients = [scenario.users.paulNeedsAssessor, scenario.users.seanNeedsAssessor].map(user =>
    DTOsHelper.getRecipientUser(user)
  );

  describe('when an innovator submits an innovation for needs assessment', () => {
    describe('NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', () => {
      it('should send an email to the innovator', async () => {
        await testEmails(InnovationSubmittedHandler, 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', {
          inputData: {
            innovationId: innovation.id,
            reassessment: false
          },
          notificationPreferenceType: NotificationCategoryEnum.INNOVATION,
          outputData: {
            innovation_name: innovation.name,
            needs_assessment: 'assessment'
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)],
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          options: {
            includeSelf: true
          }
        });
      });

      it('should send an in-app notification to the innovator', async () => {
        await testInApps(InnovationSubmittedHandler, 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', {
          context: {
            type: NotificationCategoryEnum.INNOVATION,
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: false
          },
          outputData: {
            innovationName: innovation.name,
            needsAssessment: 'assessment'
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)],
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          options: {
            includeSelf: true
          }
        });
      });
    });
    describe('NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', () => {
      it('should send an email to the assessors', async () => {
        await testEmails(InnovationSubmittedHandler, 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', {
          inputData: {
            innovationId: innovation.id,
            reassessment: false
          },
          notificationPreferenceType: NotificationCategoryEnum.INNOVATION,
          outputData: {
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id),
            needs_assessment: 'assessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator)
        });
      });

      it('should send an in-app notification to the innovator', async () => {
        await testInApps(InnovationSubmittedHandler, 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', {
          context: {
            type: NotificationCategoryEnum.INNOVATION,
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: false
          },
          outputData: {
            innovationName: innovation.name,
            needsAssessment: 'assessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator)
        });
      });
    });
  });

  describe('when an innovator submits an innovation for needs reassessment', () => {
    describe('NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', () => {
      it('should send an email to the innovator', async () => {
        await testEmails(InnovationSubmittedHandler, 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', {
          inputData: {
            innovationId: innovation.id,
            reassessment: true
          },
          notificationPreferenceType: NotificationCategoryEnum.INNOVATION,
          outputData: {
            innovation_name: innovation.name,
            needs_assessment: 'reassessment'
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)],
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          options: {
            includeSelf: true
          }
        });
      });

      it('should send an in-app notification to the innovator', async () => {
        await testInApps(InnovationSubmittedHandler, 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', {
          context: {
            type: NotificationCategoryEnum.INNOVATION,
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: true
          },
          outputData: {
            innovationName: innovation.name,
            needsAssessment: 'reassessment'
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)],
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          options: {
            includeSelf: true
          }
        });
      });
    });
    describe('NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', () => {
      it('should send an email to the assessors', async () => {
        await testEmails(InnovationSubmittedHandler, 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', {
          inputData: {
            innovationId: innovation.id,
            reassessment: true
          },
          notificationPreferenceType: NotificationCategoryEnum.INNOVATION,
          outputData: {
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id),
            needs_assessment: 'reassessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator)
        });
      });

      it('should send an in-app notification to the innovator', async () => {
        await testInApps(InnovationSubmittedHandler, 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', {
          context: {
            type: NotificationCategoryEnum.INNOVATION,
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: true
          },
          outputData: {
            innovationName: innovation.name,
            needsAssessment: 'reassessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator)
        });
      });
    });
  });
});
