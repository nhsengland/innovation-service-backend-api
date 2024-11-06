import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';
import { UserStatisticsEnum } from '../_enums/user.enums';

export type QueryType = {
  statistics: UserStatisticsEnum[];
};

export const QuerySchema = Joi.object<QueryType>({
  statistics: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(UserStatisticsEnum))
    )
    .required()
}).required();
