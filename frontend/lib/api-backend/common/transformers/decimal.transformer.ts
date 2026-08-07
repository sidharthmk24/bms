/**
 * DecimalTransformer — converts MySQL's decimal(10,2) string result
 * back to a JavaScript number on read, and ensures we never store a float.
 *
 * MySQL returns DECIMAL columns as strings via the mysql2 driver.
 * Without this transformer TypeORM would give us a string '12.50' instead
 * of the number 12.50, breaking all arithmetic.
 */
export const DecimalTransformer = {
  /** Called when writing to DB — coerce to string for the query builder */
  to: (value: number | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    return value.toFixed(2);
  },
  /** Called when reading from DB — parse MySQL's string result to number */
  from: (value: string | null): number | null => {
    if (value === null || value === undefined) return null;
    return parseFloat(value);
  },
};
