import { JoiHelper } from './joi.helper';

describe('JoiHelper suite', () => {
  describe('dateWithDefaultTime', () => {
    it('should return a Joi schema with a default time', () => {
      const schema = JoiHelper.AppCustomJoi().dateWithDefaultTime().defaultTime('09:00');
      const value = JoiHelper.Validate(schema, '2021-01-01');
      expect(value).toStrictEqual(new Date('2021-01-01T09:00:00.000Z'));
    });

    it('should return a Joi schema with 00:00 if defaultTime not provided', () => {
      const schema = JoiHelper.AppCustomJoi().dateWithDefaultTime();
      const value = JoiHelper.Validate(schema, '2021-01-01');
      expect(value).toStrictEqual(new Date('2021-01-01T00:00:00.000Z'));
    });

    it('should return a Joi schema with original time if date specified time', () => {
      const schema = JoiHelper.AppCustomJoi().dateWithDefaultTime().defaultTime('09:00');
      const value = JoiHelper.Validate(schema, '2021-01-01T10:00:00Z');
      expect(value).toStrictEqual(new Date('2021-01-01T10:00:00.000Z'));
    });
  });
});
