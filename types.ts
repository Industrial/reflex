export type ArrayType<T> = T extends (infer Item)[] ? Item : T;
export type RecordValueType<T> = T extends Record<string, infer U> ? U : never;
