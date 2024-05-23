import type { Context } from '@azure/functions';

import { JoiHelper } from '@innovations/shared/helpers';
import { container } from '../_config';
import type { SearchService } from '../_services/search.service';
import SYMBOLS from '../_services/symbols';
import { EventMessageSchema, EventMessageType } from './validation.schemas';

class V1InnovationUpdateIndexListener {
  static async queueTrigger(context: Context, requestMessage: EventMessageType): Promise<void> {
    const searchService = container.get<SearchService>(SYMBOLS.SearchService);

    context.log.info('InnovationUpdateIndex LISTENER: ', JSON.stringify(requestMessage));

    try {
      const { data } = JoiHelper.Validate<EventMessageType>(EventMessageSchema, requestMessage);

      await searchService.upsertDocument(data.innovationId);

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing message: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1InnovationUpdateIndexListener.queueTrigger;
