import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';
import { InnovationStatisticsEnum } from '../_enums/innovation.enums';


export type ParamsType = {
  innovationId: string;
}

export type QueryType = {
  statistics: InnovationStatisticsEnum[];
}

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export const QuerySchema = Joi.object<QueryType>({
  statistics: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(InnovationStatisticsEnum))).required()
}).required();
