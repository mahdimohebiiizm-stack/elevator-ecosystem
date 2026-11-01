import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind and conditional class names safely using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Converts Latin digits (0-9) to standard Persian numerals (۰-۹).
 */
export function toPersianDigits(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return text
    .toString()
    .replace(/[0-9]/g, (char) => farsiDigits[parseInt(char, 10)] || char);
}

/**
 * Formats Rial currency amounts to Persian Toman with Persian digits and comma grouping.
 * Strictly divides Rial by 10.
 *
 * @example
 * formatPersianCurrency(1450000000) // "۱۴۵,۰۰۰,۰۰۰ تومان"
 * formatPersianCurrency(0)          // "۰ تومان"
 */
export function formatPersianCurrency(amountInRial: number): string {
  if (isNaN(amountInRial) || amountInRial === null || amountInRial === undefined) {
    return "۰ تومان";
  }
  const tomanValue = Math.floor(amountInRial / 10);
  const formattedWithCommas = tomanValue.toLocaleString("en-US");
  return `${toPersianDigits(formattedWithCommas)} تومان`;
}

/**
 * Formats monetary amounts from backend Iranian Rials to presentation Toman.
 * Strictly divides the Rial value by 10, adds comma grouping, converts to Persian digits,
 * and appends " تومان".
 */
export function formatToToman(rialValue: number, usePersianDigits: boolean = true): string {
  if (isNaN(rialValue) || rialValue === null || rialValue === undefined) {
    return usePersianDigits ? "۰ تومان" : "0 تومان";
  }

  const tomanValue = Math.floor(rialValue / 10);
  const formattedWithCommas = tomanValue.toLocaleString("en-US");

  if (!usePersianDigits) {
    return `${formattedWithCommas} تومان`;
  }

  return `${toPersianDigits(formattedWithCommas)} تومان`;
}
