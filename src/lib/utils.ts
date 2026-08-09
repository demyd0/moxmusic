import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Drops keys whose value is `undefined`. The Firestore Web SDK throws
 * ("Function setDoc() called with invalid data: Unsupported field value:
 * undefined") if a document being written contains an `undefined` value
 * anywhere, which is easy to hit by accident with `field: value || undefined`
 * fallbacks - this strips those before the object reaches setDoc/addDoc.
 */
export function omitUndefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    if (obj[key] !== undefined) result[key] = obj[key];
  });
  return result;
}
