import httpTrigger from './index'
import jwt from 'jsonwebtoken';
import {
  runStubFunctionFromBindings,
  createHttpTrigger,
} from 'stub-azure-function-context';
import { AccessorOrganisationRoleEnum, AuthorizationService, IdentityProviderService, InnovatorOrganisationRoleEnum, NOSQLConnectionService, OrganisationEntity, OrganisationTypeEnum, UserEntity, UserTypeEnum } from '@nhse/shared';
import sinon = require('sinon');
import { Mongoose } from 'mongoose';
import { randEmail, randFullName, randPastDate, randPhoneNumber } from '@ngneat/falso';
import { assignInnovatorToOrganisation, closeConnection, connect, generateAccessor, generateAssessmentUser, generateOrganisation, generateOrganisationWithNUnits, generateUser, resetSeedData } from '../_utils/data-utils';

describe('me-update.function.spec', () => {

  beforeAll(async () => {
    await connect();

    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(NOSQLConnectionService.prototype, 'getConnection').mockReturnValue(sinon.createStubInstance(Mongoose))
  });

  afterEach(async () => {
    await resetSeedData();
  });

  afterAll(async () => {

    jest.resetAllMocks();
    jest.restoreAllMocks();
    await closeConnection();
  });

  it('should call the endpoint and update authenticated innovator and its organisation', async () => {

    const innovator = await generateUser(UserEntity.new({
      type: UserTypeEnum.INNOVATOR
    }));

    const organisation = await generateOrganisation(OrganisationEntity.new({ type: OrganisationTypeEnum.INNOVATOR, isShadow: false }));

    await assignInnovatorToOrganisation(InnovatorOrganisationRoleEnum.INNOVATOR_OWNER, innovator, organisation);

    const user = {
      oid: innovator.identityId,
      displayName: randFullName(),
      email: randEmail(),
    }
    const token = jwt.sign(user, 'pwd');

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: innovator.identityId,
      displayName: randFullName(),
      email: randEmail(),
      passwordResetOn: randPastDate().toDateString(),
      phone: randPhoneNumber(),
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockResolvedValue();


    const payload = {
      displayName: randFullName(),
      mobilePhone: randPhoneNumber(),
      organisation: {
        id: organisation.id,
        isShadow: organisation.isShadow,
        name: organisation.name,
        size: organisation.size,
      }
    }


    const { res } = await mockedRequestFactory({
      headers: { authorization: token },
      payload,
    });

    expect(res.status).toBe(200);
  });

  it('should call the endpoint and fail to update authenticated innovator if payload is invalid', async () => {

    const innovator = await generateUser(UserEntity.new({
      type: UserTypeEnum.INNOVATOR
    }));

    const organisation = await generateOrganisation(OrganisationEntity.new({ type: OrganisationTypeEnum.INNOVATOR, isShadow: false }));

    await assignInnovatorToOrganisation(InnovatorOrganisationRoleEnum.INNOVATOR_OWNER, innovator, organisation);

    const user = {
      oid: innovator.identityId,
      displayName: randFullName(),
      email: randEmail(),
    }
    const token = jwt.sign(user, 'pwd');

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: innovator.identityId,
      displayName: randFullName(),
      email: randEmail(),
      passwordResetOn: randPastDate().toDateString(),
      phone: randPhoneNumber(),
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockResolvedValue();


    const payload = {
      displayName: randFullName(),
      mobilePhone: randPhoneNumber(),
      // missing organisation
    }


    const { res } = await mockedRequestFactory({
      headers: { authorization: token },
      payload,
    });

    expect(res.status).toBe(400);
  });

  it('should call the endpoint and fail to update authenticated innovator if innovator has no organisation', async () => {

    const innovator = await generateUser(UserEntity.new({
      type: UserTypeEnum.INNOVATOR
    }));

    const organisation = await generateOrganisation(OrganisationEntity.new({ type: OrganisationTypeEnum.INNOVATOR, isShadow: false }));

    const user = {
      oid: innovator.identityId,
      displayName: randFullName(),
      email: randEmail(),
    }
    const token = jwt.sign(user, 'pwd');

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: innovator.identityId,
      displayName: randFullName(),
      email: randEmail(),
      passwordResetOn: randPastDate().toDateString(),
      phone: randPhoneNumber(),
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockResolvedValue();


    const payload = {
      displayName: randFullName(),
      mobilePhone: randPhoneNumber(),
      organisation: {
        id: organisation.id,
        isShadow: organisation.isShadow,
        name: organisation.name,
        size: organisation.size,
      }
    }


    const { res } = await mockedRequestFactory({
      headers: { authorization: token },
      payload,
    });

    expect(res.status).toBe(403);
  });

  it('should call the endpoint and fail updating authenticated accessor and its organisation', async () => {

    const organisation = await generateOrganisationWithNUnits(OrganisationEntity.new({ type: OrganisationTypeEnum.INNOVATOR, isShadow: false }), 1);

    const units = await organisation.organisationUnits;
    const unit = units.find(x => true);
    const accessor = await generateAccessor(AccessorOrganisationRoleEnum.ACCESSOR, organisation, unit);

    const user = {
      oid: accessor.accessor.identityId,
      displayName: randFullName(),
      email: randEmail(),
    }
    const token = jwt.sign(user, 'pwd');

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: accessor.accessor.identityId,
      displayName: randFullName(),
      email: randEmail(),
      passwordResetOn: randPastDate().toDateString(),
      phone: randPhoneNumber(),
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockResolvedValue();


    const payload = {
      displayName: randFullName(),
      mobilePhone: randPhoneNumber(),
      organisation: {
        id: organisation.id,
        isShadow: organisation.isShadow,
        name: organisation.name,
        size: organisation.size,
      }
    }


    const { res } = await mockedRequestFactory({
      headers: { authorization: token },
      payload,
    });

    expect(res.status).toBe(400);
  });

  it('should call the endpoint and update authenticated accessor', async () => {

    const organisation = await generateOrganisationWithNUnits(OrganisationEntity.new({ type: OrganisationTypeEnum.INNOVATOR, isShadow: false }), 1);

    const units = await organisation.organisationUnits;
    const unit = units.find(x => true);
    const accessor = await generateAccessor(AccessorOrganisationRoleEnum.ACCESSOR, organisation, unit);

    const user = {
      oid: accessor.accessor.identityId,
      displayName: randFullName(),
      email: randEmail(),
    }
    const token = jwt.sign(user, 'pwd');

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: accessor.accessor.identityId,
      displayName: randFullName(),
      email: randEmail(),
      passwordResetOn: randPastDate().toDateString(),
      phone: randPhoneNumber(),
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockResolvedValue();


    const payload = {
      displayName: randFullName(),
    }


    const { res } = await mockedRequestFactory({
      headers: { authorization: token },
      payload,
    });

    expect(res.status).toBe(200);
  });

  it('should call the endpoint and throw with wrong user type (invalid payload)', async () => {

    const assessment = await generateAssessmentUser();


    const user = {
      oid: assessment.identityId,
      displayName: randFullName(),
      email: randEmail(),
    }
    const token = jwt.sign(user, 'pwd');

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: assessment.identityId,
      displayName: randFullName(),
      email: randEmail(),
      passwordResetOn: randPastDate().toDateString(),
      phone: randPhoneNumber(),
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockResolvedValue();


    const payload = {
      displayName: randFullName(),
    }


    const { res } = await mockedRequestFactory({
      headers: { authorization: token },
      payload,
    });

    expect(res.status).toBe(400);
  });
});



async function mockedRequestFactory(data: any): Promise<any> {
  return runStubFunctionFromBindings(
    httpTrigger,
    [
      {
        type: 'httpTrigger',
        name: 'req',
        direction: 'in',
        data: createHttpTrigger(
          'PUT',
          'http://nhse-i-aac/api/management/me',
          { ...data.headers },
          { },
          data.payload,
          data.querystring,
        )
      }
    ]
  )
}