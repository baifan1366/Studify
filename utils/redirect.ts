import { redirect } from "next/navigation";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export function getRedirectUrlFromPath(locale?: string, role?: string) {
  const base = locale ? `/${locale}` : "";

  if (role === "tutor") {
    return `${base}/dashboard`;
  }

  // Default: student dashboard
  return `${base}/home`;
}