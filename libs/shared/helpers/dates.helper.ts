import type { DateISOType } from '../types';


export class DatesHelper {

  /**
   * Returns the difference (in days) between 2 dates.
   */
  static dateDiffInDays(startDate: DateISOType, endDate: DateISOType): number {

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    return Math.floor((eDate.getTime() - sDate.getTime()) / 1000 / 60 / 60 / 24);

  }

  static isDateEqual(firstDate: DateISOType, secondDate: DateISOType): boolean {
    return new Date(firstDate).getTime() === new Date(secondDate).getTime();
  }

}
