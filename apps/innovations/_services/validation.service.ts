import { JoiHelper } from '@innovations/shared/helpers';
import type { DomainContextType } from '@innovations/shared/types';
import { injectable } from 'inversify';
import Joi from 'joi';
import { BaseService } from './base.service';

export const ValidationRules = ['checkSupportEngaging'] as const;
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
    checkSupportEngaging: {
      handler: this.checkEngagingSupport,
      joiDefinition: Joi.object({
        supportId: Joi.string().guid().required()
      }).required()
    }
  };
  public readonly validationRules = Object.keys(this.config) as (keyof typeof this.config)[];

  constructor() {
    super();
  }

  async checkEngagingSupport(
    _domainContext: DomainContextType,
    _innovationId: string,
    _data: { year: number; month: number; day: number }
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
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
