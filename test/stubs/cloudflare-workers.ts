// Test stand-in for the Workers runtime module: no bindings, so every server helper sees "no DB" unless a test passes one in.
export const env: Record<string, unknown> = {};
