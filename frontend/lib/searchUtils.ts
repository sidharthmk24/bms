/**
 * Universal multi-keyword, case-insensitive search utility.
 * Searches across multiple fields, supporting:
 * - Multi-word keyword search (every term must match somewhere in the provided fields)
 * - Case-insensitive matching
 * - Hyphen/space-insensitive matching for ISBNs, barcodes, and order/transfer codes
 * - Safe handling of null, undefined, numbers, and arrays
 */
export function matchKeywords(
  search: string | undefined | null,
  ...fields: (string | number | boolean | null | undefined | (string | number | boolean | null | undefined)[])[]
): boolean {
  if (!search || !search.trim()) return true;

  const rawSearch = search.trim().toLowerCase();
  const keywords = rawSearch.split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return true;

  // Flatten and normalize target fields
  const flatTokens: string[] = [];
  const cleanTokens: string[] = [];

  const addToken = (val: any) => {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      val.forEach(addToken);
      return;
    }
    const str = String(val).toLowerCase().trim();
    if (!str) return;
    flatTokens.push(str);
    // If it contains dashes or spaces, also add the stripped alphanumeric version (ideal for ISBNs, barcodes, PO codes)
    if (/[-_\s]/.test(str)) {
      cleanTokens.push(str.replace(/[-_\s]/g, ''));
    }
  };

  fields.forEach(addToken);

  const combined = flatTokens.join(' ');
  const combinedClean = cleanTokens.join(' ') + ' ' + combined.replace(/[-_\s]/g, '');

  return keywords.every((kw) => {
    // Normal match
    if (combined.includes(kw)) return true;
    // Cleaned match (e.g. searching 9780062315007 matches 978-0-06-231500-7)
    const cleanKw = kw.replace(/[-_\s]/g, '');
    if (cleanKw && combinedClean.includes(cleanKw)) return true;
    return false;
  });
}
