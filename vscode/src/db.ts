import { PrismaClient } from '../database/gen'

export function get_db() {
  const db = new PrismaClient()
  return db
}

