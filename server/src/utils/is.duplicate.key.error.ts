/** A MongoDB duplicate-key error, which names the colliding field in `keyValue`. */
export const isDuplicateKeyError = (err: unknown): err is { code: 11000; keyValue: object } =>
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === 11000 &&
    "keyValue" in err &&
    typeof err.keyValue === "object" &&
    err.keyValue !== null;
