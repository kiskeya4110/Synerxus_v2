import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_BACKUP = "backups/backup-2025-12-25T01-43-47-505Z.json";
const RESTORE_ORDER = [
  "users",
  "organizations",
  "volunteer_profiles",
  "projects",
  "tasks",
  "project_impacts",
  "applications",
  "matches",
  "project_assignments",
  "calendar_events",
  "notifications",
  "badges",
  "user_badges",
  "volunteer_organization_relationships",
];

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes("--apply"),
    backupPath: args.find((arg) => !arg.startsWith("--")) || DEFAULT_BACKUP,
  };
}

async function getTableInfo(client: pg.PoolClient, table: string) {
  const columnsResult = await client.query<{
    column_name: string;
    data_type: string;
    udt_name: string;
  }>(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );

  const pkResult = await client.query<{ column_name: string }>(
    `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY kcu.ordinal_position
    `,
    [table],
  );

  return {
    columns: columnsResult.rows,
    primaryKeys: pkResult.rows.map((row) => row.column_name),
  };
}

function normalizeValue(value: unknown, column: { data_type: string; udt_name: string }) {
  if (value === undefined) return null;
  if (value !== null && (column.udt_name === "json" || column.udt_name === "jsonb")) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  return value;
}

async function resetSequence(client: pg.PoolClient, table: string, primaryKeys: string[]) {
  if (primaryKeys.length !== 1) return;

  const pk = primaryKeys[0];
  const sequence = await client.query<{ sequence_name: string | null }>(
    "SELECT pg_get_serial_sequence($1, $2) AS sequence_name",
    [`public.${table}`, pk],
  );

  const sequenceName = sequence.rows[0]?.sequence_name;
  if (!sequenceName) return;

  await client.query(
    `SELECT setval($1, COALESCE((SELECT MAX(${quoteIdent(pk)}) FROM ${quoteIdent(table)}), 1), true)`,
    [sequenceName],
  );
}

async function main() {
  const { apply, backupPath } = parseArgs();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const resolvedBackupPath = path.resolve(backupPath);
  const backup = JSON.parse(fs.readFileSync(resolvedBackupPath, "utf8"));
  const data = backup.data;

  if (!data || typeof data !== "object") {
    throw new Error(`Backup file does not contain a data object: ${resolvedBackupPath}`);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log(`${apply ? "Applying" : "Dry run for"} restore from ${backupPath}`);
    await client.query("BEGIN");

    for (const table of RESTORE_ORDER) {
      const rows = data[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`${table}: 0 rows`);
        continue;
      }

      const { columns, primaryKeys } = await getTableInfo(client, table);
      if (columns.length === 0) {
        console.log(`${table}: skipped, table does not exist`);
        continue;
      }

      const backupColumns = Object.keys(rows[0]);
      const restoreColumns = columns.filter((column) => backupColumns.includes(column.column_name));

      if (restoreColumns.length === 0) {
        console.log(`${table}: skipped, no matching columns`);
        continue;
      }

      if (primaryKeys.length === 0) {
        console.log(`${table}: skipped, no primary key found`);
        continue;
      }

      const columnSql = restoreColumns.map((column) => quoteIdent(column.column_name)).join(", ");
      const conflictSql = primaryKeys.map(quoteIdent).join(", ");
      const updateColumns = restoreColumns.filter((column) => !primaryKeys.includes(column.column_name));
      const updateSql = updateColumns.length
        ? `DO UPDATE SET ${updateColumns
            .map((column) => `${quoteIdent(column.column_name)} = EXCLUDED.${quoteIdent(column.column_name)}`)
            .join(", ")}`
        : "DO NOTHING";

      let inserted = 0;
      for (const row of rows) {
        const values = restoreColumns.map((column) => normalizeValue(row[column.column_name], column));
        const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
        await client.query(
          `
            INSERT INTO ${quoteIdent(table)} (${columnSql})
            VALUES (${placeholders})
            ON CONFLICT (${conflictSql}) ${updateSql}
          `,
          values,
        );
        inserted++;
      }

      await resetSequence(client, table, primaryKeys);
      console.log(`${table}: restored ${inserted} rows`);
    }

    if (apply) {
      await client.query("COMMIT");
      console.log("Restore committed");
    } else {
      await client.query("ROLLBACK");
      console.log("Dry run completed and rolled back. Re-run with --apply to commit.");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
