/**
 * Safe Array Utilities
 * Prevents runtime errors from undefined/null array operations
 */

/**
 * Safely get an array from a value that might be undefined, null, or not an array
 * @param value - The value to check
 * @param defaultValue - Default array to return if value is not a valid array
 * @returns A valid array
 */
export function safeArray<T>(value: T[] | undefined | null, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * Safely map over an array that might be undefined or null
 * @param array - The array to map over
 * @param callback - The mapping function
 * @returns Mapped array or empty array if input is invalid
 */
export function safeMap<T, U>(
  array: T[] | undefined | null,
  callback: (item: T, index: number, array: T[]) => U
): U[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.map(callback);
}

/**
 * Safely filter an array that might be undefined or null
 * @param array - The array to filter
 * @param predicate - The filter function
 * @returns Filtered array or empty array if input is invalid
 */
export function safeFilter<T>(
  array: T[] | undefined | null,
  predicate: (item: T, index: number, array: T[]) => boolean
): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.filter(predicate);
}

/**
 * Safely reduce an array that might be undefined or null
 * @param array - The array to reduce
 * @param callback - The reducer function
 * @param initialValue - The initial value for the reduction
 * @returns Reduced value or initial value if array is invalid
 */
export function safeReduce<T, U>(
  array: T[] | undefined | null,
  callback: (accumulator: U, currentValue: T, currentIndex: number, array: T[]) => U,
  initialValue: U
): U {
  if (!Array.isArray(array)) {
    return initialValue;
  }
  return array.reduce(callback, initialValue);
}

/**
 * Safely find an item in an array that might be undefined or null
 * @param array - The array to search
 * @param predicate - The search predicate
 * @returns Found item or undefined
 */
export function safeFind<T>(
  array: T[] | undefined | null,
  predicate: (item: T, index: number, array: T[]) => boolean
): T | undefined {
  if (!Array.isArray(array)) {
    return undefined;
  }
  return array.find(predicate);
}

/**
 * Safely get the length of an array that might be undefined or null
 * @param array - The array to check
 * @returns Array length or 0 if invalid
 */
export function safeLength(array: unknown[] | undefined | null): number {
  if (!Array.isArray(array)) {
    return 0;
  }
  return array.length;
}

/**
 * Safely check if an array includes a value
 * @param array - The array to check
 * @param searchElement - The element to search for
 * @returns True if found, false if not found or array is invalid
 */
export function safeIncludes<T>(
  array: T[] | undefined | null,
  searchElement: T
): boolean {
  if (!Array.isArray(array)) {
    return false;
  }
  return array.includes(searchElement);
}

/**
 * Safely check if every element passes a test
 * @param array - The array to check
 * @param predicate - The test function
 * @returns True if all pass (or array is empty/invalid), false otherwise
 */
export function safeEvery<T>(
  array: T[] | undefined | null,
  predicate: (item: T, index: number, array: T[]) => boolean
): boolean {
  if (!Array.isArray(array) || array.length === 0) {
    return true;
  }
  return array.every(predicate);
}

/**
 * Safely check if some element passes a test
 * @param array - The array to check
 * @param predicate - The test function
 * @returns True if any pass, false otherwise or if array is invalid
 */
export function safeSome<T>(
  array: T[] | undefined | null,
  predicate: (item: T, index: number, array: T[]) => boolean
): boolean {
  if (!Array.isArray(array)) {
    return false;
  }
  return array.some(predicate);
}

/**
 * Safely get first element of an array
 * @param array - The array to get first element from
 * @returns First element or undefined
 */
export function safeFirst<T>(array: T[] | undefined | null): T | undefined {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  return array[0];
}

/**
 * Safely get last element of an array
 * @param array - The array to get last element from
 * @returns Last element or undefined
 */
export function safeLast<T>(array: T[] | undefined | null): T | undefined {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  return array[array.length - 1];
}

/**
 * Type guard to check if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Safely flatten an array of arrays
 * @param array - The array to flatten
 * @returns Flattened array or empty array if invalid
 */
export function safeFlatten<T>(array: (T | T[])[] | undefined | null): T[] {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.flat() as T[];
}

/**
 * Safely concatenate arrays
 * @param arrays - Arrays to concatenate (any can be undefined/null)
 * @returns Concatenated array
 */
export function safeConcat<T>(...arrays: (T[] | undefined | null)[]): T[] {
  return arrays.reduce<T[]>((acc, arr) => {
    if (Array.isArray(arr)) {
      return acc.concat(arr);
    }
    return acc;
  }, []);
}

export default {
  safeArray,
  safeMap,
  safeFilter,
  safeReduce,
  safeFind,
  safeLength,
  safeIncludes,
  safeEvery,
  safeSome,
  safeFirst,
  safeLast,
  isNonEmptyArray,
  safeFlatten,
  safeConcat,
};
