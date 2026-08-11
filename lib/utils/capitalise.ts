/**
 * Uppercases the first letter of each whitespace-separated word, leaving the
 * remaining characters as typed so names like "McDonald" survive.
 */
export const capitalise = (value: string) =>
  value
    ? value.replace(
        /(^|\s)(\S)/g,
        (_match: string, prefix: string, letter: string) =>
          prefix + letter.toUpperCase(),
      )
    : value;
