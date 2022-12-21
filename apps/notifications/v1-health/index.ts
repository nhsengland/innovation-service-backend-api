import type { HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@notifications/shared/decorators';
import { InnovationActionStatusEnum, InnovationSectionEnum, InnovationSupportStatusEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { ResponseHelper } from '@notifications/shared/helpers';
import { NotifierServiceSymbol, NotifierServiceType } from '@notifications/shared/services';
import type { CustomContextType } from '@notifications/shared/types';

import { container } from '../_config';
// import { ResponseDTO } from './transformation.dtos';
// import { ParamsSchema, ParamsType } from './validation.schemas';


class V1Health {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const notifierService = container.get<NotifierServiceType>(NotifierServiceSymbol);

    try {

      const requestAssessment = { id: 'DE002E03-9744-4655-82CF-94DD147F11C3', identityId: 'de002e03-9744-4655-82cf-94dd147f11c3', type: UserTypeEnum.ASSESSMENT };
      const requestQA = { id: '829E13B3-242A-4DC5-BDB9-3F45FA0BF307', identityId: '829e13b3-242a-4dc5-bdb9-3f45fa0bf307', type: UserTypeEnum.ACCESSOR };
      const requestInnovator = { id: '5FDE0B71-BD0D-4C88-98E6-51399BB7B4AD', identityId: '5fde0b71-bd0d-4c88-98e6-51399bb7b4ad', type: UserTypeEnum.INNOVATOR };

      switch (request.query['type']) {

        case NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION:
          await notifierService.send(requestInnovator, NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION,
            {}
          );
          break;

        case NotifierTypeEnum.INNOVATION_SUBMITED:
          await notifierService.send(requestInnovator, NotifierTypeEnum.INNOVATION_SUBMITED,
            { innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD' }
          );
          break;
        
        case NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED:
          await notifierService.send(requestAssessment, NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED, 
            {
              innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
              threadId: '90D96FD1-B469-ED11-AC20-281878FB7B33'
            });
            break;
        
        case NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED:
          await notifierService.send(requestAssessment, NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED,
            {
              innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
              assessmentId: 'E10ACCD6-E9F6-EC11-B47A-501AC5B0E5F0',
              organisationUnitIds: [
                '7CD3B905-7CB6-EC11-997E-0050F25A43BD', // Shared
                // '729BF5B6-5BBA-EC11-997E-0050F25A43BD', // NOT shared
              ]
            }
          );
          break;

        case NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE:
          await notifierService.send(requestQA, NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE,
            {
              innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
              innovationSupport: {
                id: '347CB3EB-C1F7-EC11-B47A-501AC5B0E5F0', status: InnovationSupportStatusEnum.ENGAGING, message: 'one test message', statusChanged: true, 
                // first is the same as the sender, the second is another one (the first shouldn't receive the email notification)
                newAssignedAccessors: [{ id: requestQA.id }, { id: '3C05A679-7FD0-EC11-B656-0050F25A2AF6' }],
              }
            }
          );
          break;

        case NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION:
          await notifierService.send(requestQA, NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION,
            {
              innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
              organisationUnitIds: [
                '7CD3B905-7CB6-EC11-997E-0050F25A43BD', // Shared
                '729BF5B6-5BBA-EC11-997E-0050F25A43BD', // NOT shared
              ]
          });
          break;

        case NotifierTypeEnum.ACTION_CREATION:
          await notifierService.send(requestQA, NotifierTypeEnum.ACTION_CREATION,
            { innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD', action: { id: 'F5820C8D-04D5-EC11-B656-0050F25A2AF6', section: InnovationSectionEnum.INNOVATION_DESCRIPTION } }
          );
          break;

        case NotifierTypeEnum.ACTION_UPDATE:
          await notifierService.send(requestQA, NotifierTypeEnum.ACTION_UPDATE,
            {
              innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
              action: {
                id: 'F5820C8D-04D5-EC11-B656-0050F25A2AF6',
                section: InnovationSectionEnum.INNOVATION_DESCRIPTION,
                status: InnovationActionStatusEnum.REQUESTED
              }
            }
          );
          break;

        case NotifierTypeEnum.COMMENT_CREATION:
          await notifierService.send(requestInnovator, NotifierTypeEnum.COMMENT_CREATION, {
            innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
            commentId: 'E00ACCD6-E9F6-EC11-B47A-501AC5B0E5F0', // New comment
            // commentId: 'D25F704C-FCF6-EC11-B47A-501AC5B0E5F0', // New reply to comment.
            // replyToId: 'E00ACCD6-E9F6-EC11-B47A-501AC5B0E5F0'  // New reply to comment.
          });
          break;

        case NotifierTypeEnum.INNOVATION_ARCHIVED:
          await notifierService.send(requestInnovator, NotifierTypeEnum.INNOVATION_ARCHIVED, {
            innovation: {
              id: '2CE7E825-3FCD-EC11-997E-0050F25A43BD',
              name: 'ArchivalTest03',
              assignedUserIds: [
                '829E13B3-242A-4DC5-BDB9-3F45FA0BF307',
                'B7E3DE07-A826-4E15-ADCC-E8CCA874D65E',
                'E4CD3C50-C600-4DF3-8ED4-A426A78FC618'
              ]
            }
          });
          break;

        case NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION:
          await notifierService.send(requestInnovator, NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION, {
            innovationId: '33657D84-30D8-EC11-B656-0050F25A2AF6',
            transferId: '38C397F9-CA0E-ED11-BD6E-501AC5B0D993'
          });
          break;

        case NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED:
          await notifierService.send(requestInnovator, NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED, {
            innovationId: '33657D84-30D8-EC11-B656-0050F25A2AF6',
            transferId: '38C397F9-CA0E-ED11-BD6E-501AC5B0D993'
          });
          break;

        case NotifierTypeEnum.SLS_VALIDATION:
          await notifierService.send(requestInnovator, NotifierTypeEnum.SLS_VALIDATION, {
            code: '33657D84-30D8-EC11-B656-0050F25A2AF6'
          });
          break;

        case NotifierTypeEnum.LOCK_USER:
          await notifierService.send(requestInnovator, NotifierTypeEnum.LOCK_USER, {
            user: { id: '5FDE0B71-BD0D-4C88-98E6-51399BB7B4AD', identityId: '5fde0b71-bd0d-4c88-98e6-51399bb7b4ad' } // Innovator
            // user: { id: '829E13B3-242A-4DC5-BDB9-3F45FA0BF307', identityId: '829e13b3-242a-4dc5-bdb9-3f45fa0bf307' } // QA
          });
          break;

        case NotifierTypeEnum.ACCESSOR_UNIT_CHANGE:
          await notifierService.send(requestInnovator, NotifierTypeEnum.ACCESSOR_UNIT_CHANGE, {
            user: { id: '5FDE0B71-BD0D-4C88-98E6-51399BB7B4AD' },
            oldOrganisationUnitId: '7CD3B905-7CB6-EC11-997E-0050F25A43BD',
            newOrganisationUnitId: '982AB20B-7CB6-EC11-997E-0050F25A43BD'
          });
          break;

        case NotifierTypeEnum.DAILY_DIGEST:
          await notifierService.send(requestInnovator, NotifierTypeEnum.DAILY_DIGEST, {});
          break;

        case NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST:
          await notifierService.send(
            requestInnovator, 
            NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST, 
            {
            innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD'
          });
          break;
        
        case NotifierTypeEnum.INNOVATION_STOP_SHARING:
          await notifierService.send(
            requestInnovator,
            NotifierTypeEnum.INNOVATION_STOP_SHARING,
            {
              innovationId: 'EE08565E-8BB6-EC11-997E-0050F25A43BD',
              stopSharingComment: 'This is a test comment',
            });
          break;

        default:
          throw new Error('WRONG TYPE');
      }

      context.res = ResponseHelper.Ok({ id: 'ok' });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default V1Health.httpTrigger;
