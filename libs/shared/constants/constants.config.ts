export const TEXTAREA_LENGTH_LIMIT = {
  small: 200,
  medium: 500,
  mediumUp: 1000,
  largeDown: 1500,
  large: 2000
};

export const ORGANISATIONS_LENGTH_LIMITS = {
  name: 100,
  acronym: 10,
  unit_name: 100,
  unit_acronym: 10,
  size: 25,
  description: 50,
  registrationNumber: 8
};

export const THIRTY_DAYS_IN_MSEC = 1000 * 60 * 60 * 24 * 30;

export const EXPIRATION_DATES = {
  exportRequests: THIRTY_DAYS_IN_MSEC,
  transfers: THIRTY_DAYS_IN_MSEC,
  transfersDays: 30
};
