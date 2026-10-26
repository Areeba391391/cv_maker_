export function friendlyAuthError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Authentication failed";

  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("email rate limit")) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  if (lower.includes("already registered") || lower.includes("user already")) {
    return "This email is already registered. Please sign in instead.";
  }

  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "This account needs confirmation. Contact your administrator, then try again.";
  }

  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }

  if (lower.includes("invalid compact jws") || lower.includes("invalid api key")) {
    return "Service configuration error. Please contact support.";
  }

  // Never surface raw infrastructure / setup jargon to operators
  if (
    lower.includes("supabase") ||
    lower.includes(".env") ||
    lower.includes("service role") ||
    lower.includes("migration")
  ) {
    return "Unable to complete sign-in. Please try again or contact support.";
  }

  return message.length > 140 ? "Something went wrong. Please try again." : message;
}
