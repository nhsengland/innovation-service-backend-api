import { injectable } from 'inversify';
import Joi from 'joi';
import type { EntityManager } from 'typeorm';

import { BadRequestError, GenericErrorsEnum } from '@innovations/shared/errors';
import { DatesHelper, JoiHelper } from '@innovations/shared/helpers';
import type { DomainContextType } from '@innovations/shared/types';

import { BaseService } from './base.service';

export const ValidationRules = ['checkIfSupportHadAlreadyStartedAtDate'] as const;
export type ValidationRules = (typeof ValidationRules)[number];
export type ValidationResult = {
  rule: ValidationRules;
  valid: boolean;
  details?: any;
};

@injectable()
export class ValidationService extends BaseService {
  // Configuration
  private readonly config = {
    checkIfSupportHadAlreadyStartedAtDate: {
      handler: this.checkIfSupportHadAlreadyStartedAtDate.bind(this),
      joiDefinition: Joi.object({
        unitId: JoiHelper.AppCustomJoi().string().guid().required(),
        date: Joi.date().required()
      }).required()
    }
  };
  public readonly validationRules = Object.keys(this.config) as (keyof typeof this.config)[];

  constructor() {
    super();
  }

  /**
   * check if the support had already started on a particular date
   * @param _domainContext
   * @param innovationId
   * @param data the input data (unitId, year, month, day, status)
   * @param entityManager
   */
  async checkIfSupportHadAlreadyStartedAtDate(
    _domainContext: DomainContextType,
    innovationId: string,
    data: {
      unitId: string;
      date: Date;
    },
    entityManager?: EntityManager
  ): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;
    const date = new Date(data.date); // avoid mutation
    const dateString = DatesHelper.getDateAsLocalDateString(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date > today) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { message: 'Date cannot be in the future' });
    }

    const result = await em.query(
      `SELECT MIN(started_at) as minStartedAt FROM innovation_support WHERE organisation_unit_id = @0 AND innovation_id = @1`,
      [data.unitId, innovationId]
    );

    // Check if minStartedAt is not null
    if (result.length && result[0].minStartedAt) {
      const minStartedAtDate = new Date(result[0].minStartedAt);
      minStartedAtDate.setHours(0, 0, 0, 0);
      if (date >= minStartedAtDate) {
        return { rule: 'checkIfSupportHadAlreadyStartedAtDate', valid: true };
      }
    }

    return {
      rule: 'checkIfSupportHadAlreadyStartedAtDate',
      valid: false,
      details: { message: `Support had not yet started on ${dateString}` }
    };
  }

  /**
   * helper to execute the correct function based on the operation and validate the input data
   *
   * @param domainContext the user making the request
   * @param operation the operation
   * @param innovationId the innovation id
   * @param inputData the varible input data
   * @returns array of validation results
   */
  async validate<T extends keyof typeof this.config>(
    domainContext: DomainContextType,
    operation: T,
    innovationId: string,
    inputData: unknown
  ): Promise<ValidationResult[]> {
    const handler = this.config[operation];
    const data = JoiHelper.Validate(handler.joiDefinition, inputData) as any;
    const res: ValidationResult | ValidationResult[] = await handler.handler(domainContext, innovationId, data);

    return Array.isArray(res) ? res : [res];
  }
}
