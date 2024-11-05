import * as crypto from 'crypto';
import { randUuid } from '@ngneat/falso';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { assessmentUrl, dataSharingPreferencesUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { NeedsAssessmentCompleteHandler } from './needs-assessment-complete.handler';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / needs assessment complete suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  describe('when assessment completes', () => {
    const recipients = [scenario.users.johnInnovator, scenario.users.janeInnovator].map(user =>
      DTOsHelper.getRecipientUser(user)
    );
    const inputData = {
      innovationId: innovation.id,
      assessmentId: randUuid()
    };

    describe('NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR', () => {
      it('should send an email to the innovator', async () => {
        await testEmails(NeedsAssessmentCompleteHandler, 'NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR', {
          notificationPreferenceType: 'NEEDS_ASSESSMENT',
          inputData: inputData,
          outputData: {
            innovation_name: innovation.name,
            data_sharing_preferences_url: dataSharingPreferencesUrl(
              ServiceRoleEnum.INNOVATOR,
              inputData.innovationId,
              notificationId
            ),
            needs_assessment_url: assessmentUrl(
              ServiceRoleEnum.INNOVATOR,
              inputData.innovationId,
              inputData.assessmentId,
              notificationId
            )
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: recipients
        });
      });

      it('should send an inapp to the innovator', async () => {
        await testInApps(NeedsAssessmentCompleteHandler, 'NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR', {
          innovationId: inputData.innovationId,
          context: {
            type: 'NEEDS_ASSESSMENT',
            id: inputData.assessmentId
          },
          inputData: inputData,
          outputData: {
            innovationName: innovation.name,
            assessmentId: inputData.assessmentId
          },
          requestUser: DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          recipients: recipients,
          notificationId
        });
      });
    });
  });
});
