import { reduceWithEntry } from './reduce.ts';

type MapFunction<T, U = T> = (value: T, key: string) => U;
type AsyncMapFunction<T, U = T> = (value: T, key: string) => Promise<U>;

const entryApply = <T, U = T>(fn: MapFunction<T, U>) => {
  return ([key, value]: [string, T]): [string, U] => {
    return [key, fn(value, key)];
  };
};

const asyncEntryApply = <T>(fn: AsyncMapFunction<T>) => {
  return async ([key, value]: [string, T]): Promise<[string, T]> => {
    return [key, await fn(value, key)];
  };
};

export const map = <T, M = T, U = Record<string, M>>(
  fn: MapFunction<T, M>,
  object: U,
) => {
  return (Object.entries(object).map(entryApply<T, M>(fn))).reduce(
    reduceWithEntry,
    {} as Record<string, M>,
  );
};

export const asyncMap = async <T, U = Record<string, T>>(
  fn: (value: T, k: string) => Promise<T>,
  object: U,
) => {
  return (await Promise.all(Object.entries(object).map(asyncEntryApply<T>(fn))))
    .reduce(
      reduceWithEntry,
      {} as Record<string, T>,
    );
};
