import type { DocumentType202209 } from './document.type';

export const allowFileUploads = new Set<keyof DocumentType202209 >([
  'REGULATIONS_AND_STANDARDS',
  'TESTING_WITH_USERS',
  'IMPLEMENTATION_PLAN'
])