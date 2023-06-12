export const TEXTAREA_LENGTH_LIMIT = {
  xs: 200,
  s: 500,
  m: 1000,
  l: 1500,
  xl: 2000,
  xxl: 4000
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
