/**
 * Development-only logging. All calls become no-ops in production builds.
 * Use instead of raw console.log/warn for debug output that shouldn't ship.
 */

const isDev = process.env.NODE_ENV !== 'production';

function noop() {}

export const devLog: typeof console.log = isDev ? console.log.bind(console) : noop;
export const devWarn: typeof console.warn = isDev ? console.warn.bind(console) : noop;
