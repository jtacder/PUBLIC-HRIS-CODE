import { eq, and, SQL } from "drizzle-orm";

/**
 * Create a condition that excludes soft-deleted records
 */
export function notDeleted(isDeletedColumn: any): SQL {
  return eq(isDeletedColumn, false);
}

/**
 * Helper to add soft delete fields to an update
 */
export function softDeleteFields() {
  return {
    isDeleted: true,
    deletedAt: new Date(),
  } as const;
}
