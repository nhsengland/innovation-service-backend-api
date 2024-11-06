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
   * This supports negative numbers of days as well, to get the previous working day.
   *
   * @param date The date to add working days to.
   * @param days The number of working days to add.
   * @returns A new Date object representing the resulting date.
   */
  static addWorkingDays(date: Date, days: number): Date {
    const sign = days < 0 ? -1 : 1;
    days = Math.abs(days);
    const result = new Date(date);

    // Add the specified number of working days
    while (days > 0) {
      result.setDate(result.getDate() + sign);

      // Skip weekends (Saturday and Sunday)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        days--;
      }
    }

    return result;
  }

  /**
   * Converts a date to a string in the format 'YYYY-MM-DD' as of UK timezone.
   * @param date the date object
   * @returns the date as a string in the format 'YYYY-MM-DD'
   */
  static getDateAsLocalDateString(date: Date): string {
    // sv has the ISO format
    const format = Intl.DateTimeFormat('sv', { timeZone: 'Europe/London' });
    return format.format(date);
  }

  /**
   * Converts a date to a long date format string as of UK timezone.
   * @param date The date object to format.
   * @returns The date as a string in the format '18 September 2024'.
   */
  static getLongDateFormat(date: Date): string {
    const format = Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return format.format(date);
  }
}
