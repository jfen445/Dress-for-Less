// Stamped into a PaymentIntent's metadata at creation so the Stripe webhook
// knows which collection the payment's booking should be in. Rentals live in
// BookingSchema, try-ons in TryOnBookingSchema, and the two flows have
// different guarantees — see pages/api/webhooks/checkout.ts.
export enum PaymentKind {
  Rental = "rental",
  TryOn = "tryOn",
}
