import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  // Without this, Error objects passed as `{ error }` or `{ err }` serialize
  // to `{}` — pino does NOT serialize Error instances by default outside of
  // these two conventional keys. Confirmed live: every `logger.error({ error
  // }, 'message')` call across the invoices app (pdf.controller.ts,
  // invoice-email.service.ts, settings read failures, etc.) was producing
  // `error={}` in the log output instead of a message + stack trace,
  // including for a real, actionable bug (a React-PDF rendering crash) whose
  // only diagnostic evidence ended up being a separate, unrelated frontend
  // console error rather than anything in the server's own logs.
  serializers: {
    error: pino.stdSerializers.err,
    err: pino.stdSerializers.err,
  },
});
