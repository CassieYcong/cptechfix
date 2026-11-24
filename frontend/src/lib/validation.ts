// Shared form validation helpers for CP TECH FIX

export const isLettersOnly = (v: string) => /^[A-Za-z\s.'-]+$/.test((v || "").trim());
export const isValidPhone = (v: string) => {
  const p = (v || "").trim();
  if (!p) return true; // optional
  return /^(09\d{9}|\+63\s?9\d{2}\s?\d{3}\s?\d{4})$/.test(p);
};
export const isValidEmail = (v: string) => {
  const e = (v || "").trim();
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
};
export const isNonEmpty = (v: any) => String(v ?? "").trim() !== "";

// Returns an error message or "" for each field
export const validateName = (v: string, label = "Name") => {
  if (!isNonEmpty(v)) return `${label} is required.`;
  if (!isLettersOnly(v)) return `${label} must contain letters only (no numbers or special characters).`;
  return "";
};
export const validatePhone = (v: string) => {
  if (!isNonEmpty(v)) return ""; // optional
  if (!isValidPhone(v)) return "Phone must start with 09 (e.g. 09171234567) or +63 9XX XXX XXXX.";
  return "";
};
export const validateEmail = (v: string) => {
  if (!isNonEmpty(v)) return "Email is required.";
  if (!isValidEmail(v)) return "Please enter a valid email address (e.g. name@email.com).";
  return "";
};
export const validateRequired = (v: any, label: string) => {
  if (!isNonEmpty(v)) return `${label} is required.`;
  return "";
};