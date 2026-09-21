import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';

import { normalizeNameUpdate } from './identity-name.helper';

describe('identity-name helper', () => {
  it('merges a given-name-only update and derives displayName', () => {
    expect(
      normalizeNameUpdate(
        { givenName: 'Jonathan' },
        { givenName: 'John', surname: 'Smith' }
      )
    ).toMatchObject({
      givenName: 'Jonathan',
      surname: 'Smith',
      displayName: 'Jonathan Smith'
    });
  });

  it('merges a surname-only update and derives displayName', () => {
    expect(
      normalizeNameUpdate(
        { surname: 'Smythe' },
        { givenName: 'Jonathan', surname: 'Smith' }
      )
    ).toMatchObject({
      givenName: 'Jonathan',
      surname: 'Smythe',
      displayName: 'Jonathan Smythe'
    });
  });

  it('derives displayName instead of preserving a stale supplied value', () => {
    expect(
      normalizeNameUpdate(
        { givenName: 'Jonathan', surname: 'Smythe', displayName: 'John Smith' },
        { givenName: 'John', surname: 'Smith' }
      )
    ).toMatchObject({ displayName: 'Jonathan Smythe' });
  });

  it('leaves non-name updates unchanged', () => {
    const body = { accountEnabled: false };

    expect(normalizeNameUpdate(body, { givenName: 'John', surname: 'Smith' })).toBe(body);
  });

  it('rejects a name update when the merged name pair is incomplete', () => {
    expect(() =>
      normalizeNameUpdate({ givenName: 'Jonathan' }, { givenName: '', surname: '' })
    ).toThrow(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
  });
});
