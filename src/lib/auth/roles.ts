export type AppRole = "owner" | "manager" | "employee";

/** Shop admins: see customers + admin dashboard. Can also make CVs. */
export function isAdminRole(role?: string | null): boolean {
  return role === "owner" || role === "manager";
}

/** Regular operators: make CVs only — no customer directory. */
export function isUserRole(role?: string | null): boolean {
  return !isAdminRole(role);
}

export function roleLabel(role?: string | null): string {
  if (role === "owner") return "Admin (Owner)";
  if (role === "manager") return "Admin";
  return "User";
}
