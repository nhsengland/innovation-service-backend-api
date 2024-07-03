export type TypeFromArray<T> = T extends ReadonlyArray<infer K> ? K : never;

/**
 *  This converts a union type to an intersection type,
 *  ie: type A = UnionToIntersection<{a: string} | {b: number}> // {a: string, b: number}
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * ExcludeEnum is a type utility that excludes a specific enum value from a given type.
 * It takes two type parameters: T (the original type) and E (the enum value to exclude).
 * If T extends E, it returns never. Otherwise, it returns T.
 *
 * @typeparam T - The original type.
 * @typeparam E - The enum value to exclude.
 * @returns The type after excluding the enum value.
 */
export type ExcludeEnum<T, E extends T> = T extends E ? never : T;
