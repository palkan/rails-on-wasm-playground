import { PGlite } from '@electric-sql/pglite'
import { electricSync } from './pglite-sync'
import { live } from '@electric-sql/pglite/live'

export const setupPGliteDatabase = async () => {
  const db = await PGlite.create({
    extensions: {
      live,
      electric: electricSync({debug: true}),
    }
  });
  return db;
};

export const setupElectricSync = async (db, url) => {
  await db.electric.syncShapeToTable({
    shape: {
      url: `http://localhost:3131/v1/shape`,
      table: 'todos'
    },
    table: 'todos',
    primaryKey: ['id'],
  })
}
