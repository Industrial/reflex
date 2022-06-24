const DEBUG_REFLEX = Deno.env.get('DEBUG_REFLEX') === '1';

// deno-lint-ignore no-explicit-any
export const log = (...args: any[]) => {
  console.log('Reflex:', ...args);
};

// deno-lint-ignore no-explicit-any
export const debug = (...args: any[]) => {
  if (DEBUG_REFLEX) {
    log(...args);
  }
};
