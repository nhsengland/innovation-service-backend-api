import { injectable } from 'inversify';
import Joi from 'joi';
import type { EntityManager } from 'typeorm';

import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@innovations/shared/errors';
import { JoiHelper } from '@innovations/shared/helpers';
import type { DomainContextType } from '@innovations/shared/types';

import { BaseService } from './base.service';

export const ValidationRules = ['checkIfSupportStatusAtDate'] as const;
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
    checkIfSupportStatusAtDate: {
      handler: this.checkIfSupportStatusAtDate.bind(this),
      joiDefinition: Joi.object({
        supportId: Joi.string().guid().required(),
        year: Joi.number().integer().min(1900).max(2100).required(),
        month: Joi.number().integer().min(1).max(12).required(),
        day: Joi.number().integer().min(1).max(31).required(),
        status: Joi.string()
          .valid(...Object.values(InnovationSupportStatusEnum))
          .required()
      }).required()
    }
  };
  public readonly validationRules = Object.keys(this.config) as (keyof typeof this.config)[];

  constructor() {
    super();
  }

  /**
   * check if the innovation support was given status on a particular date
   * @param _domainContext
   * @param _innovationId
   * @param data
   *   - year: the year
   *   - month: the month
   *   - day: the day
   *   - status: the support status
   * @param entityManager
   */
  async checkIfSupportStatusAtDate(
    _domainContext: DomainContextType,
    _innovationId: string,
    data: {
      supportId: string;
      year: number;
      month: number;
      day: number;
      status: InnovationSupportStatusEnum;
    },
    entityManager?: EntityManager
  ): Promise<ValidationResult> {
    const em = entityManager ?? this.sqlConnection.manager;
    const dateString = `${data.year}-${data.month}-${data.day}`;
    const date = new Date(data.year, data.month - 1, data.day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    // Ensuring that the date is the same, invalid date will return NaN and semi valid date (ie: 2023-11-31) will return a different date (ie: 2023-12-01)
    if (date?.getDate() !== data.day) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { message: 'Invalid date' });
    }

    if (date > today) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { message: 'Date cannot be in the future' });
    }

    const result = await em.query(
      `SELECT TOP 1 1 from innovation_support
    FOR SYSTEM_TIME ALL
    WHERE
    status = @0
    AND id = @1
    AND DATEDIFF(day, valid_from, @2) >= 0
    AND DATEDIFF(day, valid_to, @2) <= 0`,
      [data.status, data.supportId, dateString]
    );

    return result.length
      ? { rule: 'checkIfSupportStatusAtDate', valid: true }
      : {
          rule: 'checkIfSupportStatusAtDate',
          valid: false,
          details: { message: `Support status ${data.status} was not valid on ${dateString}` }
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
