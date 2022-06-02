export const reduceWithEntry = <T>(
  a: Record<string, T>,
  [k, v]: [string, T],
) => {
  a[k] = v;
  return a;
};

export const reduceWithMerge = <T>(
  a: Record<string, T>,
  b: Record<string, T>,
) => {
  return {
    ...a,
    ...b,
  };
};
