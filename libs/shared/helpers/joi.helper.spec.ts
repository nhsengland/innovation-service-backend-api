import { JoiHelper } from './joi.helper';

describe('JoiHelper suite', () => {
  describe('dateWithDefaultTime', () => {
    it('should return a Joi schema with a default time', () => {
      const schema = JoiHelper.AppCustomJoi().dateWithDefaultTime().defaultTime('09:00');
      const { error } = schema.validate('2021-01-01');
      expect(error).toBeUndefined();
    });
  });
});
