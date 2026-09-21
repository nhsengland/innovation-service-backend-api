import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';
import type { IdentityUserInfo } from '@users/shared/types';

import type { IdentityOperationType } from './validation.schemas';

type IdentityOperationBody = IdentityOperationType['data']['body'];
type IdentityNames = Pick<IdentityUserInfo, 'givenName' | 'surname'>;

export const normalizeNameUpdate = (
  body: IdentityOperationBody,
  currentIdentity: IdentityNames
): IdentityOperationBody => {
  const hasGivenName = Object.prototype.hasOwnProperty.call(body, 'givenName');
  const hasSurname = Object.prototype.hasOwnProperty.call(body, 'surname');

  if (!hasGivenName && !hasSurname) {
    return body;
  }

  const givenName = hasGivenName ? body.givenName : currentIdentity.givenName;
  const surname = hasSurname ? body.surname : currentIdentity.surname;

  if (!givenName?.trim() || !surname?.trim()) {
    throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
  }

  const normalizedGivenName = givenName.trim();
  const normalizedSurname = surname.trim();

  return {
    ...body,
    givenName: normalizedGivenName,
    surname: normalizedSurname,
    displayName: `${normalizedGivenName} ${normalizedSurname}`
  };
};
