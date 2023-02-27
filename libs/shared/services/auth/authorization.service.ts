import { randomBytes, scrypt } from 'crypto';
import { inject, injectable } from 'inversify';

import { NotifierTypeEnum } from '../../enums';
import { ForbiddenError, GenericErrorsEnum, ServiceUnavailableError } from '../../errors';
import { SLSEventTypeEnum, SLSModel } from '../../schemas/sls.schema';
import type { CustomContextType, DomainContextType } from '../../types';
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType } from '../interfaces';
import { AuthorizationValidationModel } from './authorization-validation.model';


@injectable()
export class AuthorizationService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { }


  /**
  * Authorization validations methods.
  */
  validate(ctx: CustomContextType): AuthorizationValidationModel {
    const authInstance = new AuthorizationValidationModel(this.domainService);
    if (ctx.auth?.user.identityId) { authInstance.setUser(ctx.auth.user.identityId); }
    if (ctx.auth?.user.roleId) { authInstance.setRoleId(ctx.auth.user.roleId); }
    return authInstance;
  }


  /**
  * SLS (Second level security) methods.
  */

  async validateSLS(identityId: string, eventType: SLSEventTypeEnum, domainContext: DomainContextType, id?: string, code?: string): Promise<{ isValid: boolean, id?: string }> {

    const isValid = await this.verifySLS(identityId, eventType, id, code);
    if (isValid) {
      return { isValid: true };
    }

    const slsId = await this.generateSLS(identityId, eventType, domainContext);

    throw new ForbiddenError(GenericErrorsEnum.SLS_AUTHORIZATION, {
      message: 'SLS verification needed! Repeat the operation resending the SLS id with the user supplied code',
      details: { id: slsId }
    });

  }

  private async verifySLS(identityId: string, eventType: SLSEventTypeEnum, id?: string, code?: string): Promise<boolean> {
    // get 6 digit code from document store for this user
    // if it exists, compare it
    // if it matches, return true

    if (!code) {
      // code already validated for this operation
      // do not resend and let the operation to carry through
      const totp = await SLSModel.findOne({ userId: identityId, eventType }).exec();

      return !!totp && !!totp.validatedAt;
    }

    const ttlCode = await SLSModel.findOne({ _id: id, userId: identityId, eventType }).exec();

    if (!ttlCode) return false;

    const verified = !ttlCode.validatedAt ? await this.verify(code, ttlCode.code) : true;

    if (verified) {
      await SLSModel.findByIdAndUpdate(id, { validatedAt: new Date() }).exec();
    }

    return verified;

  }

  private async generateSLS(identityId: string, eventType: SLSEventTypeEnum, domainContext: DomainContextType): Promise<string> {

    const user = await this.domainService.users.getUserInfo({ identityId });

    // Generate a 6 digit code and hash it.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await this.hash(code);

    // Save hashed code SLS document.
    const dbCode = await SLSModel.findOneAndUpdate(
      { userId: identityId, eventType },
      { code: hashedCode, eventType, createdAt: new Date() },
      { upsert: true, new: true }
    ).exec().catch(error => {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_NOSQL_UNAVAILABLE, { details: error });
    });

    // Send notification to user with code.
    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.SLS_VALIDATION,
      { code },
      domainContext,
    );

    return dbCode.get('_id').toString();

  }


  private async hash(password: string): Promise<string> {

    return new Promise((resolve, reject) => {
      const salt = randomBytes(16).toString('hex');
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });

  }

  private async verify(password: string, hash: string): Promise<boolean> {

    // TODO: Refactor this to use Node require('crypto')
    // Cyrpto NPM package has been deprecated
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      scrypt(password, salt || '', 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });

  }

}
