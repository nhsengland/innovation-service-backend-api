import { InnovationExportRequestStatusEnum } from '@notifications/shared/enums';
import { RecipientsService } from '../_services/recipients.service';
import type { InnovationRecordExportFeedbackHandler } from './innovation-record-export-feedback.handler';

import { CompleteScenarioType, TestsHelper } from '@notifications/shared/tests';

describe('Notifications / _handlers / innovation-record-export-feedback handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let handler: InnovationRecordExportFeedbackHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;
  });

  beforeEach(() => {
    //mock innovation info
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    })
  });

  describe('Innovation record export rquest is APPROVED', () => {

    beforeEach(() => {
      jest.spyOn(RecipientsService.prototype, 'getExportRequestInfo').mockResolvedValueOnce({
        
      }) 
    })
  })

});
