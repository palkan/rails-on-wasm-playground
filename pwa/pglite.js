import { PGlite } from '@electric-sql/pglite'

export const setupPGliteDatabase = async () => {
  const db = new PGlite();
  await db.waitReady
  return db;
};

export const registerPGliteInterface = (self, db) => {
  self.pglite4rails = db;
}
