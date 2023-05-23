export * from './activity.enums';
export * from './announcement.enums';
export * from './general.enums';
export * from './innovation.enums';
export * from './notification.enums';
export { NotifierTypeEnum } from './notifier.enums';
export * from './organisation.enums';
export * from './user.enums';

// TODO - set these in a file, just fixing for now
export const MaturityLevelCatalogueType = ['DISCOVERY', 'ADVANCED', 'READY'] as const;
export type MaturityLevelCatalogueType = (typeof MaturityLevelCatalogueType)[number];

export const YesPartiallyNoCatalogueType = ['YES', 'PARTIALLY', 'NO'] as const;
export type YesPartiallyNoCatalogueType = (typeof YesPartiallyNoCatalogueType)[number];

export const YesOrNoCatalogueType = ['YES', 'NO'] as const;
export type YesOrNoCatalogueType = (typeof YesOrNoCatalogueType)[number];
