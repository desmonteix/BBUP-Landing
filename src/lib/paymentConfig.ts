/**
 * Mercado Pago is switched off for now: Peruvian buyers pay by Yape and send a
 * receipt that an administrator approves. Set to true to restore the card
 * checkout (all Mercado Pago code, webhook and env vars are left in place).
 */
export const MERCADOPAGO_ENABLED = false;

export const yapeAccount = { number: "966101088", holder: "Mariah Guevara" } as const;
