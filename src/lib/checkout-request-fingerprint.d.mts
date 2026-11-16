export function buildCanonicalCheckoutRequest(orderData: Record<string, unknown> | null | undefined, orderItems: Record<string, unknown>[] | null | undefined): unknown;
export function serializeCanonicalCheckoutRequest(orderData: Record<string, unknown> | null | undefined, orderItems: Record<string, unknown>[] | null | undefined): string;
export function createCheckoutRequestFingerprint(orderData: Record<string, unknown> | null | undefined, orderItems: Record<string, unknown>[] | null | undefined): Promise<string>;
