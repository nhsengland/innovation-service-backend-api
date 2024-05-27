import type { HttpRequest } from '@azure/functions';
import { container } from '../config/inversify.config';
import type { StorageQueueService } from '../services';
import { QueuesEnum } from '../services/integrations/storage-queue.service';
import SHARED_SYMBOLS from '../services/symbols';
import type { CustomContextType } from '../types';

export const ElasticSearchEventUpdateTypes = ['INNOVATION_UPDATE', 'ASSESSMENT_UPDATE', 'SUPPORT_UPDATE'] as const;
export type ElasticSearchEventUpdateTypes = (typeof ElasticSearchEventUpdateTypes)[number];

export type ElasticSearchEventUpdateMessageType = {
  data: {
    innovationId: string;
    type: ElasticSearchEventUpdateTypes;
  };
};

type DocumentUpdateParams = { type: ElasticSearchEventUpdateTypes, identifierResponseField?: string };

export function ElasticSearchDocumentUpdate(options: DocumentUpdateParams) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    const storageService = container.get<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService);

    descriptor.value = async function (context: CustomContextType, request: HttpRequest) {
      await original.apply(this, [context, request]);

      if (context.res?.['status'] >= 400) {
        return;
      }

      let innovationId =
        request.params['innovationId'] ?? request.query['innovationId'] ?? request.body['innovationId'];

      if ('identifierResponseField' in options && options.identifierResponseField) {
        innovationId = context.res?.['body'][options.identifierResponseField];
      }

      await storageService.sendMessage<ElasticSearchEventUpdateMessageType>(QueuesEnum.ELASTIC_SEARCH, {
        data: { innovationId, type: options.type }
      });
    };
  };
}
