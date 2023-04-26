export type TypeFromArray<T> = T extends ReadonlyArray<infer K> ? K : never;

/**
 *  This converts a union type to an intersection type,
 *  ie: type A = UnionToIntersection<{a: string} | {b: number}> // {a: string, b: number}
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
