type AsyncMapFunction<T, U = T> = (value: T, key: string) => Promise<U>;

const asyncEntryApply = <T>(fn: AsyncMapFunction<T>) => {
  return async ([key, value]: [string, T]): Promise<[string, T]> => {
    return [key, await fn(value, key)];
  };
};

export const asyncMap = async <T, U = Record<string, T>>(
  fn: (value: T, k: string) => Promise<T>,
  object: U,
) => {
  return (await Promise.all(Object.entries(object).map(asyncEntryApply<T>(fn))))
    .reduce(
      (a, [k, v]) => {
        a[k] = v;
        return a;
      },
      {} as Record<string, T>,
    );
};
