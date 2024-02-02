import { container } from '../../../_config/';

import { randText } from '@ngneat/falso';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { InnovationArchiveHandler } from './innovation-archive.handler';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { InnovationStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / innovation-archive suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.johnInnovator;
  const innovation = requestUser.innovations.johnInnovation;
  const message = randText();

  describe('AI01_INNOVATION_ARCHIVED_TO_SELF', () => {
    const ownerRecipient = [DTOsHelper.getRecipientUser(requestUser)];

    it('should send an email to owner of innovation', async () => {
      await testEmails(InnovationArchiveHandler, 'AI01_INNOVATION_ARCHIVED_TO_SELF', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: ownerRecipient,
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          previousStatus: InnovationStatusEnum.IN_PROGRESS,
          affectedUsers: []
        },
        outputData: {
          innovation_name: innovation.name
        },
        options: { includeSelf: true }
      });
    });

    it('should send an in-app to owner of innovation', async () => {
      await testInApps(InnovationArchiveHandler, 'AI01_INNOVATION_ARCHIVED_TO_SELF', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: ownerRecipient,
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          previousStatus: InnovationStatusEnum.IN_PROGRESS,
          affectedUsers: []
        },
        outputData: { innovationName: innovation.name },
        options: { includeSelf: true }
      });
    });
  });

  describe('AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS', () => {
    const collaboratorRecipients = [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)];

    it('should send an email to collaborators', async () => {
      await testEmails(InnovationArchiveHandler, 'AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: collaboratorRecipients,
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          previousStatus: InnovationStatusEnum.IN_PROGRESS,
          affectedUsers: []
        },
        outputData: {
          innovation_name: innovation.name
        }
      });
    });

    it('should send an in-app to collaborators', async () => {
      await testInApps(InnovationArchiveHandler, 'AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: collaboratorRecipients,
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          previousStatus: InnovationStatusEnum.IN_PROGRESS,
          affectedUsers: []
        },
        outputData: { innovationName: innovation.name }
      });
    });
  });

  describe('AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A', () => {
    const assignedUsersRecipients = [
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
      DTOsHelper.getRecipientUser(scenario.users.samAccessor)
    ];

    it('should send an email to QA/A', async () => {
      await testEmails(InnovationArchiveHandler, 'AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: assignedUsersRecipients,
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          previousStatus: InnovationStatusEnum.IN_PROGRESS,
          affectedUsers: [
            {
              userId: scenario.users.aliceQualifyingAccessor.id,
              userType: scenario.users.aliceQualifyingAccessor.roles.qaRole.role
            },
            { userId: scenario.users.samAccessor.id, userType: scenario.users.samAccessor.roles.accessorRole.role }
          ]
        },
        outputData: {
          innovation_name: innovation.name,
          archived_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
        }
      });
    });

    it('should send an in-app to QA/A', async () => {
      await testInApps(InnovationArchiveHandler, 'AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: assignedUsersRecipients,
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          previousStatus: InnovationStatusEnum.IN_PROGRESS,
          affectedUsers: [
            {
              userId: scenario.users.aliceQualifyingAccessor.id,
              userType: scenario.users.aliceQualifyingAccessor.roles.qaRole.role
            },
            { userId: scenario.users.samAccessor.id, userType: scenario.users.samAccessor.roles.accessorRole.role }
          ]
        },
        outputData: {
          innovationName: innovation.name,
          archivedUrl: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
        }
      });
    });
  });

  describe('AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT', () => {
    it('should send an email to assigned assessor', async () => {
      await testEmails(InnovationArchiveHandler, 'AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)],
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          affectedUsers: [
            {
              userId: scenario.users.paulNeedsAssessor.id,
              userType: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
            }
          ],
          previousStatus: InnovationStatusEnum.ARCHIVED
        },
        outputData: {
          innovation_name: innovation.name,
          assessment_type: 'assessment'
        }
      });
    });

    it('should not send an email to assigned assessor', async () => {
      await testEmails(InnovationArchiveHandler, 'AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [],
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          affectedUsers: [
            {
              userId: scenario.users.paulNeedsAssessor.id,
              userType: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
            }
          ],
          previousStatus: InnovationStatusEnum.IN_PROGRESS
        },
        outputData: {
          innovation_name: innovation.name,
          assessment_type: 'assessment'
        }
      });
    });

    it('should send an inapp to assigned assessor', async () => {
      await testInApps(InnovationArchiveHandler, 'AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)],
        inputData: {
          innovationId: innovation.id,
          message,
          reassessment: false,
          affectedUsers: [
            {
              userId: scenario.users.paulNeedsAssessor.id,
              userType: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
            }
          ],
          previousStatus: InnovationStatusEnum.ARCHIVED
        },
        outputData: {
          innovationName: innovation.name,
          assessmentType: 'assessment'
        }
      });
    });
  });
});
