import type { Root, Schema } from 'joi';
import Joi, { Context } from 'joi';

import { BadRequestError, GenericErrorsEnum } from '../errors';

export type PaginationQueryParamsType<T extends string> = {
  take: number;
  skip: number;
  order: { [key in T]?: 'ASC' | 'DESC' };
};

export class JoiHelper {
  static Validate<T>(schema: Schema, data: any, context?: Context): T {
    const { error, value } = schema.validate(data, { abortEarly: false, context: context || {} });

    if (error) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, {
        details: error.details.map(item => ({
          key: item.path.join('.'),
          type: item.type,
          message: item.message,
          context: (({ key, label, child, ...params }) => params)(item.context || {}) // Removes some unneeded properties from context.
        }))
      });
    }

    return value;
  }

  static AppCustomJoi(): Root & {
    stringArray: () => Joi.ArraySchema;
    stringArrayOfObjects: () => Joi.ArraySchema;
    stringObject: () => Joi.ObjectSchema;
    decodeURIString: () => Joi.StringSchema;
    decodeURIDate: () => Joi.DateSchema;
    dateWithDefaultTime: () => Joi.DateSchema & { defaultTime: (time: string) => Joi.DateSchema };
  } {
    return Joi.extend(
      {
        type: 'stringArray',
        base: Joi.array().meta({ baseType: 'array' }),
        coerce(value) {
          return typeof value !== 'string'
            ? { value }
            : {
                value: value
                  .replace(/(^,+)|(,+$)/gm, '')
                  .split(',')
                  .filter(item => item)
              };
        }
      },

      {
        type: 'stringArrayOfObjects',
        base: Joi.array().meta({ baseType: 'array' }),
        coerce(value) {
          const match = value.match(/\{.*?\}/g); // Get all the objects inside the string
          return match ? { value: match.map((o: string) => JSON.parse(o)) } : { value };
        }
      },

      {
        type: 'stringObject',
        base: Joi.object().meta({ baseType: 'object' }),
        coerce(value) {
          try {
            return { value: JSON.parse(value) };
          } catch (err) {
            return { value };
          }
        }
      },

      {
        type: 'decodeURIString',
        base: Joi.string().meta({ baseType: 'string' }),
        prepare(value) {
          return typeof value !== 'string' ? { value } : { value: decodeURIComponent(value) };
        }
      },

      {
        type: 'decodeURIDate',
        base: Joi.date().meta({ baseType: 'date' }),
        prepare(value, _helpers) {
          return typeof value !== 'string' ? { value } : { value: decodeURIComponent(value) };
        }
      },

      {
        type: 'dateWithDefaultTime',
        base: Joi.date().meta({ baseType: 'date' }),
        coerce(value, helpers) {
          if (
            value instanceof Date &&
            value.getHours() === 0 &&
            value.getMinutes() === 0 &&
            value.getSeconds() === 0 &&
            helpers.schema.$_getRule('defaultTime')?.args?.['time']
          ) {
            const time = helpers.schema.$_getRule('defaultTime')?.args?.['time'].split(':');
            const hours = parseInt(time[0], 10);
            const minutes = parseInt(time[1], 10);
            value.setHours(hours, minutes);
          }
          return { value };
        },
        rules: {
          defaultTime: {
            convert: true,
            method(time) {
              return this.$_addRule({ name: 'defaultTime', args: { time } });
            },
            args: [
              {
                name: 'time',
                ref: true,
                assert: value => typeof value === 'string' && !!value.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                message: 'must be a valid time (HH:MM)'
              }
            ]
          }
        }
      }
    );
  }

  static PaginationJoiSchema(data: {
    orderKeys: string[];
    skip?: number;
    take?: number;
    maxTake?: number;
    defaultOrder?: { [key: string]: 'ASC' | 'DESC' };
  }): Joi.ObjectSchema {
    return Joi.object({
      skip: Joi.number()
        .integer()
        .default(data.skip ?? 0),
      take: Joi.number()
        .integer()
        .max(data.maxTake ?? 100)
        .default(data.take ?? 20),
      order: this.AppCustomJoi()
        .stringObject()
        // This validates if the format is { field: 'ASC' | 'DESC' } (and uppercase 'asc' to 'ASC').
        .pattern(Joi.string().valid(...data.orderKeys), Joi.string().valid('ASC', 'DESC').uppercase())
        .optional()
        .default(data.defaultOrder ?? { default: 'DESC' })
    });
  }
}
