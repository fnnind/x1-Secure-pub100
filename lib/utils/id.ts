import { v7 as uuidv7 } from 'uuid'

/**
 * Generate a UUIDv7 for database entity primary keys.
 * Use this for all inserts so Postgres B-tree indexes retain locality.
 */
export function generateId(): string {
  return uuidv7()
}
