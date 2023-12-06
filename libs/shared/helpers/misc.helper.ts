// eslint-disable-next-line @typescript-eslint/ban-types
export type ResolvedNestedPromise<T> = T extends Object
  ? T extends Promise<infer InnerType>
    ? ResolvedNestedPromise<InnerType>
    : {
        [K in keyof T]: ResolvedNestedPromise<T[K]>;
      }
  : T;

/**
 * This function resolves nested promises in an object hierarchically. This also works with typeorm entities replacing the __.
 *
 * Currently it only supports arrays, objects and primitives.
 * @param entity the object to resolve.
 * @param typeOrm if true, it will resolve the promises of typeorm entities.
 * @returns the object without nested promises.
 */
export const resolveNestedPromises = async <T extends Record<string, any>>(
  entity: T,
  typeOrm = true
): Promise<ResolvedNestedPromise<T>> => {
  const plain = {} as ResolvedNestedPromise<T>;
  for (const key of Object.keys(entity)) {
    let value = (entity as any)[key];
    // Typeorm adds __ to the keys of the entities for unresolved promises. Simplified the replace assuming there's no __ in the key.
    const myKey: keyof ResolvedNestedPromise<T> = typeOrm ? key.replace(/__/g, '') : key;

    if (value instanceof Promise) {
      value = await value;
    }

    if (value instanceof Array) {
      (plain as any)[myKey] = await Promise.all(
        value.map(async item => {
          if (item instanceof Object) {
            return await resolveNestedPromises(item);
          } else {
            return item;
          }
        })
      );
    } else if (value instanceof Object) {
      plain[myKey] = await resolveNestedPromises(value);
    } else {
      plain[myKey] = value;
    }
  }

  return plain;
};

/**
 * groups an array of objects by a key
 * @param array array of items
 * @param key the key
 * @returns map of key and array of items
 */
export const groupBy = <T, K extends keyof T>(array: T[], key: K): Map<T[K], T[]> => {
  return array.reduce((acc, item) => {
    if (!acc.has(item[key])) {
      acc.set(item[key], []);
    }
    acc.get(item[key])?.push(item);
    return acc;
  }, new Map<T[K], T[]>());
};
