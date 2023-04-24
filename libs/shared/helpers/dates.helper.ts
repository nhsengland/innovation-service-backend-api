


export class DatesHelper {

  /**
   * Returns the difference (in days) between 2 dates.
   */
  static dateDiffInDays(startDate: Date, endDate: Date): number {
    return Math.floor((endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24);
  }

  static isDateEqual(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getTime() === secondDate.getTime();
  }

}
