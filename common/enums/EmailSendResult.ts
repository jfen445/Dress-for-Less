// The outcome of a single transactional email send. Resend's client resolves
// with an { error } object rather than throwing, so a send is only Sent once
// that error has been checked — see pages/api/admin/sendBookingEmails.ts,
// where a Failed send must not stamp instructionsSentAt on the booking.
export enum EmailSendResult {
  Sent = "sent",
  Failed = "failed",
}
