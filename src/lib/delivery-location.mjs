const unavailable = "Not provided";

export function getDeliveryLocation(order) {
  const address = order?.shipping_address;
  const parsed = typeof address === "string" ? tryParseAddress(address) : address;
  const fields = parsed && typeof parsed === "object" ? parsed : {};
  return {
    recipient: order?.customer_name || unavailable,
    phone: order?.customer_phone || unavailable,
    address: (typeof parsed === "string" ? parsed : fields.address) || unavailable,
    city: fields.city || unavailable,
    state: fields.state || unavailable,
    country: fields.country || unavailable,
    postalCode: fields.postal_code || unavailable,
    instructions: fields.delivery_instructions || unavailable,
  };
}

function tryParseAddress(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
