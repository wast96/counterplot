import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function testDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../migrations/0001_auth_and_workspaces.sql', import.meta.url), 'utf8'));
  const adapter = {
    prepare(sql) {
      const make = args => ({
        bind: (...values) => make(values),
        first: async () => db.prepare(sql).get(...args) || null,
        all: async () => ({ results: db.prepare(sql).all(...args) }),
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
        _run: () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } })
      });
      return make([]);
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { const result = statements.map(s => s._run()); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
  return { DB: adapter, raw: db };
}
