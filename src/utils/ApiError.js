class AppiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    statck = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.data = null;
    this.success = false;

    if (stack) {
      this.stack = statck;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { AppiError };
