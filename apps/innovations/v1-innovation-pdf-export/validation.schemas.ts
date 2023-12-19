import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import Joi from 'joi';
import type { InnovationAllSectionsType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};

export type BodyType = InnovationAllSectionsType;

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export const BodySchema = Joi.array()
  .items({
    sections: Joi.array()
      .items(
        Joi.object({
          section: Joi.string().required(),
          status: Joi.string()
            .valid(...Object.values(InnovationSectionStatusEnum), 'UNKNOWN')
            .required(),
          answers: Joi.array()
            .items(
              Joi.object({
                label: Joi.string().required(),
                value: Joi.string().allow(null, '').required()
              })
            )
            .required()
        })
      )
      .required(),
    title: Joi.string().required()
  })
  .required();
