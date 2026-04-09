const ADMIN_EMAILS = new Set(["bjorn@hedenstrom.nu"]);

export function isConfiguredAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.has(email.trim().toLowerCase()));
}
