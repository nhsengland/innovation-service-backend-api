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

  /**
   * Adds the specified number of working days to the given date.
   * @param date The date to add working days to.
   * @param days The number of working days to add.
   * @returns A new Date object representing the resulting date.
   */
  static addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);

    // Add the specified number of working days
    while (days > 0) {
      result.setDate(result.getDate() + 1);

      // Skip weekends (Saturday and Sunday)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        days--;
      }
    }

    return result;
  }
}
