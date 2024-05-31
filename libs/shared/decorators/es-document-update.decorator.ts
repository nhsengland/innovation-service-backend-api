import type { HttpRequest } from '@azure/functions';
import { container } from '../config/inversify.config';
import type { RedisService } from '../services';
import SHARED_SYMBOLS from '../services/symbols';
import type { CustomContextType } from '../types';

type DocumentUpdateParams = { identifierResponseField?: string };

export function ElasticSearchDocumentUpdate(options?: DocumentUpdateParams) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    const redisService = container.get<RedisService>(SHARED_SYMBOLS.RedisService);

    descriptor.value = async function (context: CustomContextType, request: HttpRequest) {
      await original.apply(this, [context, request]);

      if (context.res?.['status'] >= 400) {
        return;
      }

      let innovationId =
        request.params['innovationId'] ?? request.query['innovationId'] ?? request.body['innovationId'];

      if (options && 'identifierResponseField' in options && options.identifierResponseField) {
        innovationId = context.res?.['body'][options.identifierResponseField];
      }

      await redisService.addToSet('elasticsearch', innovationId);
    };
  };
}
