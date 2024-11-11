import * as crypto from 'crypto';
import { InnovationSubmittedHandler } from './innovation-submitted.handler';

import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

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
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          outputData: {
            innovation_name: innovation.name,
            assessment_type: 'assessment'
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
            type: 'NEEDS_ASSESSMENT',
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: false
          },
          outputData: {
            innovationName: innovation.name,
            assessmentType: 'assessment'
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)],
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          options: {
            includeSelf: true
          },
          notificationId
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
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          outputData: {
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id, notificationId),
            assessment_type: 'assessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator)
        });
      });

      it('should send an in-app notification to the innovator', async () => {
        await testInApps(InnovationSubmittedHandler, 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', {
          context: {
            type: 'NEEDS_ASSESSMENT',
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: false
          },
          outputData: {
            innovationName: innovation.name,
            assessmentType: 'assessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          notificationId
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
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          outputData: {
            innovation_name: innovation.name,
            assessment_type: 'reassessment'
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
            type: 'NEEDS_ASSESSMENT',
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: true
          },
          outputData: {
            innovationName: innovation.name,
            assessmentType: 'reassessment'
          },
          recipients: [DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)],
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          options: {
            includeSelf: true
          },
          notificationId
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
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          outputData: {
            innovation_name: innovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id, notificationId),
            assessment_type: 'reassessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator)
        });
      });

      it('should send an in-app notification to the innovator', async () => {
        await testInApps(InnovationSubmittedHandler, 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', {
          context: {
            type: 'NEEDS_ASSESSMENT',
            id: innovation.id
          },
          innovationId: innovation.id,
          inputData: {
            innovationId: innovation.id,
            reassessment: true
          },
          outputData: {
            innovationName: innovation.name,
            assessmentType: 'reassessment'
          },
          recipients: naRecipients,
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.ottoOctaviusInnovator),
          notificationId
        });
      });
    });
  });
});
