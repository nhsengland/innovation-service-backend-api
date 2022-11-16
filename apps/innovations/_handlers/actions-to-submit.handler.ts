import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';
import { BaseHandler } from './base.handler';
import type { UserTypeEnum } from '@innovations/shared/enums';
import type { InnovationStatisticsInputType } from '../_types/innovation.types';
import { container } from '../_config';
import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from '../_services/interfaces';
export class AccessorUnitChangeHandler extends BaseHandler<
  InnovationStatisticsEnum.ACTIONS_TO_SUBMIT
> {

  private recipientsService: InnovationActionsServiceType;

  constructor(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    data: InnovationStatisticsInputType[InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]
  ) {
    super(requestUser, data);
    this.recipientsService = container.get(InnovationActionsServiceSymbol);
  }
  
  async run(): Promise<this> {

    this.statistics.push({
      innovationId: this.inputData.innovationId,
      response: {
        from: 10,
        total: 50,
        lastSubmittedAt: new Date().toISOString(),
      }
    });
    return this;
  }

}