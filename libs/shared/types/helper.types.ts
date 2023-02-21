export type TypeFromArray<T> = T extends ReadonlyArray<infer K> ? K : never;
