import { DatesHelper } from './dates.helper';

describe('DatesHelper', () => {
  describe('addWorkingDays', () => {
    describe('when date is 2023-01-01 (Sunday)', () => {
      it('returns same day when adding 0 days ', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 0);
        expect(result).toEqual(date);
      });

      it('returns next Monday when adding 1 working day', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 1);
        expect(result).toEqual(new Date('2023-01-02'));
      });

      it('returns next Friday when adding 5 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 5);
        expect(result).toEqual(new Date('2023-01-06'));
      });

      it('returns Tuesday (2 weeks) when adding 7 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 7);
        expect(result).toEqual(new Date('2023-01-10'));
      });

      it('returns Friday (2 weeks) when adding 10 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 10);
        expect(result).toEqual(new Date('2023-01-13'));
      });

      it('returns Thursday (3 weeks) when adding 14 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 14);
        expect(result).toEqual(new Date('2023-01-19'));
      });

      it('returns Friday (3 weeks) when adding 15 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, 15);
        expect(result).toEqual(new Date('2023-01-20'));
      });
    });

    describe('when date is 2023-01-01 (Sunday) removing days', () => {
      it('returns previous Friday when removing 1 working day', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, -1);
        expect(result).toEqual(new Date('2022-12-30'));
      });

      it('returns previous Monday when removing 5 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, -5);
        expect(result).toEqual(new Date('2022-12-26'));
      });

      it('returns previous Thursday (2 weeks) when removing 7 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, -7);
        expect(result).toEqual(new Date('2022-12-22'));
      });

      it('returns previous Monday (2 weeks) when removing 10 working days', () => {
        const date = new Date('2023-01-01');
        const result = DatesHelper.addWorkingDays(date, -10);
        expect(result).toEqual(new Date('2022-12-19'));
      });
    });

    describe('when date is 2023-01-04 (Wednesday)', () => {
      it('returns same day when adding 0 days ', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 0);
        expect(result).toEqual(date);
      });

      it('returns next Thursday when adding 1 working day', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 1);
        expect(result).toEqual(new Date('2023-01-05'));
      });

      it('returns next week Wednesday when adding 5 working days', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 5);
        expect(result).toEqual(new Date('2023-01-11'));
      });

      it('returns next week Friday when adding 7 working days', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 7);
        expect(result).toEqual(new Date('2023-01-13'));
      });

      it('returns Wednesday (2 weeks) when adding 10 working days', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 10);
        expect(result).toEqual(new Date('2023-01-18'));
      });

      it('returns Tuesday (3 weeks) when adding 14 working days', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 14);
        expect(result).toEqual(new Date('2023-01-24'));
      });

      it('returns Friday (3 weeks) when adding 15 working days', () => {
        const date = new Date('2023-01-04');
        const result = DatesHelper.addWorkingDays(date, 15);
        expect(result).toEqual(new Date('2023-01-25'));
      });
    });
  });
});
