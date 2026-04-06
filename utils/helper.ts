export function formatDisplayText(text: string) {
  if (!text) return "Unknown";

  const trimmed = text.trim();

  // ✅ If already has uppercase letters → keep as is
  if (/[A-Z]/.test(trimmed)) return trimmed;

  // ✅ Convert to Title Case
  return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
}