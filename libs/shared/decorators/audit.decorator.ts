import type { HttpRequest } from '@azure/functions';
import { get } from 'lodash';

import { container } from '../config/inversify.config';
import { GenericErrorsEnum } from '../errors';
import { NotImplementedError } from '../errors/errors.config';
import { ActionEnum, TargetEnum } from '../services/integrations/audit.service';
import {
  AuditServiceSymbol,
  AuditServiceType,
  SQLConnectionServiceSymbol,
  SQLConnectionServiceType
} from '../services/interfaces';
import type { CustomContextType } from '../types';

// Support multiple types of options in order to extract the identifier from either the requestParam, requestQyery, requestBody or responseBody
type AuditOptions = { action: ActionEnum; target: TargetEnum } & (
  | { identifierParam: string }
  | { identifierQuery: string }
  | { identifierBody: string }
  | { identifierResponseField: string }
);

/**
 * Audit decorator for Azure Functions that will add an audit entry to the queue.
 * @param params either an array or a single object with the following properties:
 *  - action: ActionEnum              - The action that is being performed.
 *  - target: TargetEnum              - The target of the action.
 * either one of the following properties:
 *  - identifierParam: string         - The name of the request parameter that contains the identifier of the target.
 *  - identifierQuery: string         - The name of the request query that contains the identifier of the target.
 *  - identifierBody: string          - The name of the request body that contains the identifier of the target.
 *  - identifierResponseField: string - The name of the response field that contains the identifier of the target.
 *
 * Note: the identifier string can be a dot notation string to access nested properties.
 *
 * @example
 *  - @Audit({action: ActionEnum.CREATE, target: TargetEnum.THREAD, identifierResponseField: 'thread.id'})
 *  - @Audit({action: ActionEnum.READ, target: TargetEnum.INNOVATION, identifierParam: 'innovationId'})
 *
 * @returns the decorated function result
 */
export function Audit(params: AuditOptions | AuditOptions[]) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    const auditService = container.get<AuditServiceType>(AuditServiceSymbol);
    // TODO - sqlConnection is used to get the user id from the externalId. This should be removed and a cached query should be used instead once implemented
    const sqlConnection = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol).getConnection();

    // Support either single or array of audit options
    const auditOptions = Array.isArray(params) ? params : [params];

    descriptor.value = async function (context: CustomContextType, request: HttpRequest) {
      await original.apply(this, [context, request]);

      // TODO maybe we should audit request errors, but that's what Apps Insights is for
      if (context.res?.['status'] >= 400) {
        return;
      }

      // Loop through each audit option and add an audit entry
      for (const option of auditOptions) {
        // Get the identifier from the request (param, query, body or response) with dotted notation support
        let label: string;
        let obj: Record<string, any>;
        if ('identifierParam' in option) {
          label = option.identifierParam;
          obj = request.params;
        } else if ('identifierResponseField' in option) {
          label = option.identifierResponseField;
          obj = context.res?.['body'];
        } else {
          // This is for a future need where the targetId is not in the request params but in other places
          throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
            message: 'Audit decorator only supports identifierParam and identifierResposneField at the moment.'
          });
        }
        const targetId = get(obj, label);

        // Infer the innovation id (maybe make this configurable in the future)
        // Note: this is a related meta field to be used in relations with audit entries. Future use cases could either use this, add multiple related audit_entries or some other solution
        //       Reason being is that most of the audit entries are not necessarily related to the innovation, but they are related to the innovation in the context of the current request.
        const innovationId =
          option.target === TargetEnum.INNOVATION
            ? targetId
            : request.params['innovationId'] || request.query['innovationId'] || request.body['innovationId'];

        // Get the user id from the externalId
        const user = (
          await sqlConnection
            .createQueryBuilder()
            .select('id')
            .from('user', 'user')
            .where('user.external_id = :externalId', { externalId: context.auth.user.identityId })
            .getRawOne()
        )?.id;

        await auditService.audit({
          user: user,
          action: option.action,
          target: option.target,
          targetId: targetId ?? null,
          innovationId: innovationId,
          invocationId: context.invocationId,
          functionName: context.executionContext.functionName
          // correlationId: string (if we use this in the future this could either be the session or some other field that marks the start of the request chain)
        });
      }

      return;
    };
  };
}
