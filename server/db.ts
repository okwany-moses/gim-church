import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import pg from 'pg';

export interface CompatDatabase {
  get<T = any>(sql: string, ...params: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  run(sql: string, ...params: any[]): Promise<{ lastID?: number; changes?: number }>;
  exec(sql: string): Promise<void>;
  close?(): Promise<void>;
}

class PostgresCompatDatabase implements CompatDatabase {
  private pool: pg.Pool;

  constructor(config: string | { host?: string; user?: string; password?: string; database?: string }) {
    if (typeof config === 'string') {
      this.pool = new pg.Pool({
        connectionString: config,
        ssl: config.includes('localhost') || config.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false } // Required for hosting on Neon / Supabase in production
      });
    } else {
      this.pool = new pg.Pool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionTimeoutMillis: 15000,
      });
    }
  }

  private translate(sql: string, params: any[]): { sql: string; params: any[] } {
    let pgSql = sql;
    
    // 1. Convert SQLite automatic keys and types
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // 2. Skip SQLite-specific PRAGMAs
    if (pgSql.toUpperCase().includes('PRAGMA ')) {
      return { sql: 'SELECT 1', params: [] };
    }

    // 3. Convert SQLite 'INSERT OR IGNORE' -> PostgreSQL 'ON CONFLICT DO NOTHING'
    if (pgSql.toUpperCase().includes('INSERT OR IGNORE INTO')) {
      pgSql = pgSql.replace(/INSERT OR IGNORE INTO (\w+)/i, 'INSERT INTO $1');
      if (pgSql.toLowerCase().includes('bible_chapters_cache')) {
        pgSql += ' ON CONFLICT (book, chapter, translation) DO NOTHING';
      } else {
        pgSql += ' ON CONFLICT DO NOTHING';
      }
    }

    // 4. Convert SQLite 'INSERT OR REPLACE'
    if (pgSql.toUpperCase().includes('INSERT OR REPLACE INTO')) {
      if (pgSql.toLowerCase().includes('bible_chapters_cache')) {
        pgSql = pgSql.replace(
          /INSERT OR REPLACE INTO bible_chapters_cache \((.*?)\) VALUES \((.*?)\)/i,
          'INSERT INTO bible_chapters_cache ($1) VALUES ($2) ON CONFLICT (book, chapter, translation) DO UPDATE SET verses_json = EXCLUDED.verses_json'
        );
      } else if (pgSql.toLowerCase().includes('bible_search_cache')) {
        pgSql = pgSql.replace(
          /INSERT OR REPLACE INTO bible_search_cache \((.*?)\) VALUES \((.*?)\)/i,
          'INSERT INTO bible_search_cache ($1) VALUES ($2) ON CONFLICT (query, translation) DO UPDATE SET results_json = EXCLUDED.results_json'
        );
      } else {
        // Backup restore: INSERT OR REPLACE INTO table (col1, col2) VALUES (?, ?)
        const match = pgSql.match(/INSERT OR REPLACE INTO (\w+) \((.*?)\) VALUES \((.*?)\)/i);
        if (match) {
          const table = match[1];
          const colsStr = match[2];
          const valsStr = match[3];
          const columns = colsStr.split(',').map((c: string) => c.trim());
          const updateCols = columns.filter((c: string) => c.toLowerCase() !== 'id');
          const updateSet = updateCols.map((c: string) => `${c} = EXCLUDED.${c}`).join(', ');
          pgSql = `INSERT INTO ${table} (${colsStr}) VALUES (${valsStr}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
        }
      }
    }

    // 5. Convert ? placeholders to $1, $2, $3...
    let paramCounter = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramCounter++}`);

    return { sql: pgSql, params };
  }

  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    const args = Array.isArray(params[0]) ? params[0] : params;
    const { sql: pgSql, params: pgParams } = this.translate(sql, args);
    const result = await this.pool.query(pgSql, pgParams);
    return result.rows[0];
  }

  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const args = Array.isArray(params[0]) ? params[0] : params;
    const { sql: pgSql, params: pgParams } = this.translate(sql, args);
    const result = await this.pool.query(pgSql, pgParams);
    return result.rows;
  }

  async run(sql: string, ...params: any[]): Promise<{ lastID?: number; changes?: number }> {
    const args = Array.isArray(params[0]) ? params[0] : params;
    const { sql: pgSql, params: pgParams } = this.translate(sql, args);
    const result = await this.pool.query(pgSql, pgParams);
    return {
      changes: result.rowCount ?? undefined,
      lastID: result.rows?.[0]?.id ?? undefined
    };
  }

  async exec(sql: string): Promise<void> {
    const { sql: pgSql } = this.translate(sql, []);
    await this.pool.query(pgSql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: any = null;
let dbPromise: Promise<CompatDatabase> | null = null;
let currentDbType: 'sqlite' | 'postgresql' | 'cloudsql' = 'sqlite';

export function getDbType(): 'sqlite' | 'postgresql' | 'cloudsql' {
  return currentDbType;
}

export function getDb(): Promise<CompatDatabase> {
  if (!dbPromise) {
    dbPromise = initializeDatabase().catch((err) => {
      console.error('Critical database initialization failed. Resetting promise for retry:', err);
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function generateNextRegNumber(db: CompatDatabase): Promise<string> {
  try {
    const rows = await db.all("SELECT reg_number FROM members WHERE reg_number IS NOT NULL AND reg_number != ''");
    let maxNum = 0;
    for (const row of rows) {
      if (row.reg_number) {
        // Strip any non-digit prefixes to find numeric sequence part or just try parsing
        const cleaned = row.reg_number.replace(/\D/g, '');
        if (cleaned) {
          const num = parseInt(cleaned, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        } else {
          const num = parseInt(row.reg_number, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    return String(maxNum + 1).padStart(3, '0');
  } catch (err) {
    console.error('Error generating sequence registration number:', err);
    return '001';
  }
}

async function initializeDatabase(): Promise<CompatDatabase> {
  if (dbInstance) return dbInstance;

  const sqlHost = process.env.SQL_HOST;
  const sqlUser = process.env.SQL_USER;
  const sqlPassword = process.env.SQL_PASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME;
  const sqlAdminUser = process.env.SQL_ADMIN_USER;
  const sqlAdminPassword = process.env.SQL_ADMIN_PASSWORD;

  if (sqlHost && sqlUser && sqlPassword && sqlDbName) {
    console.log('Cloud SQL environment detected. Connecting via connection pool...');
    try {
      const pgDb = new PostgresCompatDatabase({
        host: sqlHost,
        user: sqlUser,
        password: sqlPassword,
        database: sqlDbName
      });
      // Test connection
      await pgDb.get('SELECT 1');
      console.log('Connected to Cloud SQL successfully.');
      
      // Assign instantly so we NEVER fall back to SQLite if the DB is reachable
      dbInstance = pgDb;
      currentDbType = 'cloudsql';
      
      if (sqlAdminUser && sqlAdminPassword) {
        console.log('Cloud SQL admin credentials detected. Initializing schema as admin...');
        const adminDb = new PostgresCompatDatabase({
          host: sqlHost,
          user: sqlAdminUser,
          password: sqlAdminPassword,
          database: sqlDbName
        });
        try {
          // Grant schema permission to app user
          await adminDb.exec(`GRANT ALL ON SCHEMA public TO "${sqlUser}"`);

          // Grant privileges on all existing tables and sequences to app user (safely catch if none exist yet)
          try {
            await adminDb.exec(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${sqlUser}"`);
            await adminDb.exec(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${sqlUser}"`);
          } catch (e) {
            console.log('Note: Table privilege sync skipped (already owned by app user or not needed)');
          }
          
          // Also alter default privileges so future tables/sequences are accessible to the app user
          try {
            await adminDb.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${sqlUser}"`);
            await adminDb.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${sqlUser}"`);
          } catch (e) {
            console.log('Note: Default privilege sync skipped or not supported');
          }

          // Schema migrations are handled safely within initDb() as the app user who owns the tables

          // Try to transfer table ownership to the app user so future migrations / operations are possible
          console.log('Transferring table ownership to app user...');
          const tablesToTransfer = [
            'branches',
            'cell_groups',
            'members',
            'contributions',
            'expenditures',
            'attendance_sessions',
            'attendance_records',
            'prayer_requests',
            'bulk_sms',
            'bible_chapters_cache',
            'bible_search_cache',
            'events',
            'sermons',
            'hymns',
            'system_backups',
            'tasks',
            'users'
          ];
          for (const table of tablesToTransfer) {
            try {
              await adminDb.exec(`ALTER TABLE "${table}" OWNER TO "${sqlUser}"`);
            } catch (ownerErr) {
              // Table may not exist yet, or other error, ignore
            }
          }
          
          // Initialise the schema and seed AS THE APP USER, so that the app user owns all tables
          console.log('Running schema initialization and seeding as the app user...');
          await initDb(pgDb);
          
          console.log('Admin schema initialization and permission grant completed successfully.');
        } catch (adminErr) {
          console.error('Error during admin permission grant / app schema initialization:', adminErr);
          console.warn('Attempting normal initialization as app user...');
          try {
            await initDb(pgDb);
          } catch (pgInitErr) {
            console.error('Warning: Schema/seed initialization as app user failed:', pgInitErr);
          }
        } finally {
          try {
            await adminDb.close();
          } catch (e) {}
        }
      } else {
        try {
          await initDb(pgDb);
        } catch (pgInitErr) {
          console.error('Warning: Schema/seed initialization failed:', pgInitErr);
        }
      }
      
      return dbInstance;
    } catch (pgErr) {
      console.error('Failed to connect to Cloud SQL:', pgErr);
      console.warn('Falling back to other database options...');
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('Production database URL detected. Connecting to PostgreSQL...');
    try {
      const pgDb = new PostgresCompatDatabase(dbUrl);
      // Test the connection
      await pgDb.get('SELECT 1');
      console.log('Connected to PostgreSQL successfully.');
      
      // Assign instantly so we NEVER fall back to SQLite if the DB is reachable
      dbInstance = pgDb;
      currentDbType = 'postgresql';

      // Initialize schemas & seeds
      try {
        await initDb(pgDb);
      } catch (pgInitErr) {
        console.error('Warning: Schema/seed initialization failed:', pgInitErr);
      }
      return dbInstance;
    } catch (pgErr) {
      console.error('Failed to connect to PostgreSQL:', pgErr);
      console.warn('Falling back to SQLite database...');
    }
  }

  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'church.db');
  const dbDir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (dirErr) {
    console.error('Failed to create database directory:', dirErr);
  }

  try {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Test query and key settings to verify integrity
    await dbInstance.run('PRAGMA foreign_keys = ON');
    await dbInstance.get('SELECT 1');

    await initDb(dbInstance);
  } catch (error: any) {
    const errorMsg = String(error?.message || error || '');
    console.error('Database integrity check failed:', errorMsg);

    if (
      errorMsg.includes('CORRUPT') || 
      errorMsg.includes('malformed') || 
      errorMsg.includes('disk image') ||
      errorMsg.includes('corrupted')
    ) {
      console.warn('SQLite database is corrupted. Initiating self-healing recovery...');
      
      try {
        if (dbInstance) {
          await dbInstance.close();
        }
      } catch (e) {}
      dbInstance = null;

      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
          console.warn('Successfully removed corrupted database file at:', dbPath);
        }
      } catch (unlinkErr) {
        console.error('Failed to delete corrupted database file:', unlinkErr);
      }

      // Open new clean database
      dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      await dbInstance.run('PRAGMA foreign_keys = ON');
      await initDb(dbInstance);
      console.log('Self-healing database recovery complete. Seeded fresh database.');
    } else {
      throw error;
    }
  }

  currentDbType = 'sqlite';
  return dbInstance;
}

async function initDb(db: CompatDatabase) {
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      pastor TEXT NOT NULL,
      date_opened TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cell_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      leader TEXT NOT NULL,
      meeting_details TEXT NOT NULL,
      branch_id INTEGER,
      FOREIGN KEY(branch_id) REFERENCES branches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      join_date TEXT NOT NULL,
      status TEXT NOT NULL, -- Active, Inactive, Visitor
      gender TEXT NOT NULL, -- Male, Female
      family_role TEXT NOT NULL, -- Father, Mother, Youth, Child, Single
      birth_date TEXT NOT NULL,
      branch_id INTEGER,
      cell_group_id INTEGER,
      reg_number TEXT,
      FOREIGN KEY(branch_id) REFERENCES branches(id) ON DELETE SET NULL,
      FOREIGN KEY(cell_group_id) REFERENCES cell_groups(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      member_name TEXT, -- Stores name directly if anonymous or for historical tracking
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- Tithe, Offering, Building Fund, Missions, Benevolence
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL, -- M-Pesa, Cash, Bank Transfer, Cheque
      cell_group_id INTEGER,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL,
      FOREIGN KEY(cell_group_id) REFERENCES cell_groups(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenditures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- Salaries, Utilities, Charity, Missions, Maintenance, Events, Stationery, Other
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Approved'
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      service_name TEXT NOT NULL, -- Sunday Service, Mid-Week Prayer, Youth Meeting
      branch_id INTEGER NOT NULL,
      FOREIGN KEY(branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      status TEXT NOT NULL, -- Present, Absent
      FOREIGN KEY(session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sermons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      speaker TEXT NOT NULL,
      date TEXT NOT NULL,
      summary TEXT NOT NULL,
      media_url TEXT
    );

    CREATE TABLE IF NOT EXISTS hymns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      key TEXT,
      category TEXT,
      lyrics_english TEXT NOT NULL,
      lyrics_kiswahili TEXT NOT NULL,
      lyrics_luo TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL, -- Pending, In Progress, Completed
      category TEXT NOT NULL -- Event, Facility, Administration, Other
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  // Wrap seeding in individual try-catch blocks to prevent any seeding conflict from aborting overall database initialization
  console.log('Running database seeding...');

  let alreadySeeded = false;
  try {
    const backupCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM system_backups');
    if (backupCount && Number(backupCount.count) > 0) {
      alreadySeeded = true;
      console.log('Database already initialized and seeded. Skipping mock data generation to preserve user edits.');
    }
  } catch (err) {
    // Table does not exist yet or count failed, we will proceed with seeding
  }

  // 1. system_backups
  try {
    if (!alreadySeeded) {
      const backupCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM system_backups');
      if (backupCount && Number(backupCount.count) === 0) {
        await db.run("INSERT OR IGNORE INTO system_backups (id, timestamp) VALUES (1, '2026-06-30 18:45:12')");
      }
    }
  } catch (err) {
    console.error('Seeding system_backups failed:', err);
  }

  if (!alreadySeeded) {
    // 2. tasks
    try {
      const taskCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM tasks');
      if (taskCount && Number(taskCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO tasks (id, title, description, assigned_to, due_date, status, category) VALUES 
          (1, 'Setup Sound System for Crusade', 'Coordinate with the HQ tech team to test all wireless microphones, audio mixer, and outdoor speakers.', 'Emmanuel Ochieng', '2026-07-09', 'Pending', 'Event'),
          (2, 'HQ Sanctuary Roof Inspection', 'Inspect the main sanctuary metal sheets for leakages before the July rains begin.', 'Elder Moses Okwany', '2026-07-05', 'In Progress', 'Facility'),
          (3, 'Prepare Financial Statement Q2', 'Compile all tithes, offerings, and administrative expenses from the four regional branches.', 'Jane Awuor', '2026-07-15', 'Pending', 'Administration'),
          (4, 'Repair Guest House Lighting', 'Replace blown bulbs and rewire the switches in the guest rooms.', 'Silas Owino', '2026-06-29', 'Completed', 'Facility')
        `);
      }
    } catch (err) {
      console.error('Seeding tasks failed:', err);
    }

    // 3. branches
    try {
      const branchCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM branches');
      if (branchCount && Number(branchCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO branches (id, name, location, pastor, date_opened) VALUES 
          (1, 'GIMK Headquarters (Ramba-Kabondo)', 'Ramba, Kabondo, Homa Bay County', 'Rev. Dr. Jared Okwany', '2010-04-12'),
          (2, 'GIMK Nairobi Branch', 'Kawangware, Nairobi', 'Pastor Benson Ochieng', '2015-08-20'),
          (3, 'GIMK Kisumu Branch', 'Nyalenda, Kisumu', 'Pastor Mary Atieno', '2018-02-15'),
          (4, 'GIMK Homa Bay Branch', 'Homa Bay Town, Homa Bay', 'Pastor Silas Owino', '2021-11-05')
        `);
      }
    } catch (err) {
      console.error('Seeding branches failed:', err);
    }

    // 4. cell_groups
    try {
      const cellCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM cell_groups');
      if (cellCount && Number(cellCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO cell_groups (id, name, leader, meeting_details, branch_id) VALUES
          (1, 'Ramba Grace Fellowship', 'Elder Moses Okwany', 'Tuesdays 5:30 PM - Ramba Village', 1),
          (2, 'Kabondo Light Fellowship', 'Deaconess Jane Awuor', 'Thursdays 6:00 PM - Kabondo Center', 1),
          (3, 'Kawangware Hope Cell', 'Bro. Kevin Wafula', 'Wednesdays 6:30 PM - Kawangware Area 56', 2),
          (4, 'Nyalenda Victory Group', 'Sister Grace Akinyi', 'Fridays 5:00 PM - Nyalenda B', 3),
          (5, 'Homa Bay Town Fellowship', 'Elder Collins Omondi', 'Tuesdays 6:00 PM - Sofia Estate', 4)
        `);
      }
    } catch (err) {
      console.error('Seeding cell_groups failed:', err);
    }

    // 5. members
    try {
      const memberCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM members');
      if (memberCount && Number(memberCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO members (id, name, contact, join_date, status, gender, family_role, birth_date, branch_id, cell_group_id) VALUES
          (1, 'Elder Moses Okwany', '+254712345678', '2010-05-01', 'Active', 'Male', 'Father', '1978-04-15', 1, 1),
          (2, 'Jane Awuor', '+254722222333', '2011-02-14', 'Active', 'Female', 'Mother', '1982-08-22', 1, 2),
          (3, 'Collins Omondi', '+254733333444', '2021-12-01', 'Active', 'Male', 'Father', '1985-11-12', 4, 5),
          (4, 'Mary Atieno', '+254744444555', '2018-02-15', 'Active', 'Female', 'Mother', '1975-01-30', 3, 4),
          (5, 'Silas Owino', '+254755555666', '2021-11-05', 'Active', 'Male', 'Father', '1980-06-18', 4, 5),
          (6, 'Emmanuel Ochieng', '+254766666777', '2012-06-10', 'Active', 'Male', 'Youth', '1998-09-05', 1, 1),
          (7, 'Grace Akinyi', '+254777777888', '2018-03-01', 'Active', 'Female', 'Single', '1990-12-25', 3, 4),
          (8, 'Kevin Wafula', '+254788888999', '2015-09-01', 'Active', 'Male', 'Father', '1983-03-14', 2, 3),
          (9, 'Beatrice Adhiambo', '+254799999000', '2022-01-15', 'Active', 'Female', 'Youth', '2001-05-20', 1, 2),
          (10, 'Benson Ochieng', '+254711122233', '2015-08-20', 'Active', 'Male', 'Father', '1976-10-10', 2, 3),
          (11, 'David Kiprop', '+254722233344', '2023-04-10', 'Visitor', 'Male', 'Single', '1995-07-08', 1, NULL),
          (12, 'Sarah Cherono', '+254733344455', '2024-01-18', 'Visitor', 'Female', 'Youth', '2002-11-30', 2, NULL)
        `);
      }
    } catch (err) {
      console.error('Seeding members failed:', err);
    }

    // 6. contributions
    try {
      const contrCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM contributions');
      if (contrCount && Number(contrCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO contributions (id, member_id, member_name, amount, type, date, payment_method) VALUES
          (1, 1, 'Elder Moses Okwany', 5000, 'Tithe', '2026-06-01', 'M-Pesa'),
          (2, 2, 'Jane Awuor', 3500, 'Tithe', '2026-06-02', 'M-Pesa'),
          (3, 6, 'Emmanuel Ochieng', 1000, 'Offering', '2026-06-07', 'Cash'),
          (4, 8, 'Kevin Wafula', 4500, 'Tithe', '2026-06-05', 'Bank Transfer'),
          (5, NULL, 'Anonymous', 25000, 'Building Fund', '2026-06-07', 'Bank Transfer'),
          (6, 1, 'Elder Moses Okwany', 2000, 'Missions', '2026-06-14', 'M-Pesa'),
          (7, 3, 'Collins Omondi', 3000, 'Tithe', '2026-06-15', 'M-Pesa'),
          (8, 4, 'Mary Atieno', 4000, 'Tithe', '2026-06-15', 'M-Pesa'),
          (9, 9, 'Beatrice Adhiambo', 500, 'Offering', '2026-06-21', 'Cash'),
          (10, NULL, 'Anonymous Walk-In', 12500, 'Offering', '2026-06-21', 'Cash'),
          (11, 1, 'Elder Moses Okwany', 6000, 'Tithe', '2026-06-28', 'M-Pesa'),
          (12, 2, 'Jane Awuor', 3500, 'Tithe', '2026-06-28', 'M-Pesa')
        `);
      }
    } catch (err) {
      console.error('Seeding contributions failed:', err);
    }

    // 7. expenditures
    try {
      const expCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM expenditures');
      if (expCount && Number(expCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO expenditures (id, category, amount, date, description) VALUES
          (1, 'Salaries', 30000, '2026-06-25', 'Monthly allowance for local pastors & staff'),
          (2, 'Utilities', 4500, '2026-06-10', 'HQ Electricity and water bills'),
          (3, 'Charity', 15000, '2026-06-12', 'Support for local primary school in Ramba'),
          (4, 'Missions', 8000, '2026-06-18', 'Evangelism outreach support in Kabondo regional markets'),
          (5, 'Maintenance', 6200, '2026-06-05', 'Repair of sound system microphones and cables'),
          (6, 'Events', 12000, '2026-06-20', 'Catering & materials for the Annual Youth Fellowship seminar')
        `);
      }
    } catch (err) {
      console.error('Seeding expenditures failed:', err);
    }

    // 8. attendance_sessions & records
    try {
      const attSessCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM attendance_sessions');
      if (attSessCount && Number(attSessCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO attendance_sessions (id, date, service_name, branch_id) VALUES
          (1, '2026-06-07', 'Sunday Main Service', 1),
          (2, '2026-06-14', 'Sunday Main Service', 1),
          (3, '2026-06-21', 'Sunday Main Service', 1),
          (4, '2026-06-28', 'Sunday Main Service', 1),
          (5, '2026-06-07', 'Sunday Main Service', 2),
          (6, '2026-06-14', 'Sunday Main Service', 2)
        `);
        
        const attRecCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM attendance_records');
        if (attRecCount && Number(attRecCount.count) === 0) {
          await db.run(`INSERT OR IGNORE INTO attendance_records (id, session_id, member_id, status) VALUES
            (1, 1, 1, 'Present'),
            (2, 1, 2, 'Present'),
            (3, 1, 6, 'Present'),
            (4, 1, 9, 'Present'),
            (5, 1, 11, 'Present'),
            (6, 2, 1, 'Present'),
            (7, 2, 2, 'Present'),
            (8, 2, 6, 'Absent'),
            (9, 2, 9, 'Present'),
            (10, 2, 11, 'Absent'),
            (11, 3, 1, 'Present'),
            (12, 3, 2, 'Present'),
            (13, 3, 6, 'Present'),
            (14, 3, 9, 'Present'),
            (15, 3, 11, 'Present'),
            (16, 4, 1, 'Present'),
            (17, 4, 2, 'Present'),
            (18, 4, 6, 'Present'),
            (19, 4, 9, 'Present'),
            (20, 4, 11, 'Absent'),
            (21, 5, 8, 'Present'),
            (22, 5, 10, 'Present'),
            (23, 5, 12, 'Present'),
            (24, 6, 8, 'Present'),
            (25, 6, 10, 'Present'),
            (26, 6, 12, 'Absent')
          `);
        }
      }
    } catch (err) {
      console.error('Seeding attendance failed:', err);
    }

    // 9. events
    try {
      const eventCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM events');
      if (eventCount && Number(eventCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO events (id, title, description, date, location) VALUES
          (1, 'Annual Revival & Healing Crusade', 'A powerful 3-day spiritual gathering with guest speakers from all over East Africa.', '2026-07-10', 'GIMK HQ Grounds, Ramba-Kabondo'),
          (2, 'Regional Youth Empowerment Seminar', 'Mentorship session on entrepreneurship, career growth, and Christian integrity.', '2026-07-18', 'Nairobi Kawangware Branch'),
          (3, 'All-Cell Fellowship Open Day', 'Joint prayer and worship meeting followed by fellowship meals with all regional cell members.', '2026-08-01', 'GIMK HQ Church Hall, Ramba')
        `);
      }
    } catch (err) {
      console.error('Seeding events failed:', err);
    }

    // 10. sermons
    try {
      const sermonCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM sermons');
      if (sermonCount && Number(sermonCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO sermons (id, title, speaker, date, summary, media_url) VALUES
          (1, 'Walking by Faith, Not by Sight', 'Rev. Dr. Jared Okwany', '2026-06-28', 'Deep exploration of Genesis 12 and the call of Abraham, encouraging believers to move forward even when the future is unseen.', 'https://www.soundclouddemo.com/gimk/sermon-2026-06-28.mp3'),
          (2, 'The Power of a Unified Church', 'Pastor Benson Ochieng', '2026-06-21', 'Focusing on Psalm 133 and Ephesians 4, discussing how unity attracts Gods blessing and drives impactful ministry.', 'https://www.youtube.com/gimk/sermon-2026-06-21.mp4'),
          (3, 'The Heart of True Stewardship', 'Rev. Dr. Jared Okwany', '2026-06-14', 'A sermon on Malachi 3 and 2 Corinthians 9, highlighting that giving is a matter of heart gratitude rather than mere obligation.', 'https://www.soundclouddemo.com/gimk/sermon-2026-06-14.mp3')
        `);
      }
    } catch (err) {
      console.error('Seeding sermons failed:', err);
    }

    // 11. hymns
    try {
      const hymnCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM hymns');
      if (hymnCount && Number(hymnCount.count) === 0) {
        await db.run(`INSERT OR IGNORE INTO hymns (id, number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo) VALUES
          (1, 1, 'Amazing Grace / Wema wa Ajabu / Ngono Mar Adhum', 'G', 'Grace & Salvation', 
  'Amazing grace! How sweet the sound
  That saved a wretch like me!
  I once was lost, but now am found;
  Was blind, but now I see.
  
  Through many dangers, toils and snares,
  I have already come;
  Tis grace hath brought me safe thus far,
  And grace will lead me home.',
  'Wema wa ajabu wa Mwokozi,
  Uliookoa roho yangu!
  Nilipotea nikatafutwa,
  Sasa ninaona kwa wema wake.
  
  Katika hatari na taabu nyingi,
  Nimepitishwa salama;
  Wema ndio ulioniongoza,
  Wema utanipeleka nyumbani.',
  'Ngono mar adhum makwayo richo,
  Ma neno chuny kendo duto!
  Ne alal ngang to sani ayudore,
  An ne muofni, sani aneno.
  
  Kuom sand kendo kuom masiche duto,
  Asewok maber to mabor;
  Ng''wono kenda emasegenga,
  Kendo ng''wono notera dala.'),
  
          (2, 2, 'How Great Thou Art / Wewe ni Mkuu / En Dichuo Maduong''', 'Bf', 'Praise & Worship',
  'O Lord my God, when I in awesome wonder
  Consider all the worlds Thy hands have made,
  I see the stars, I hear the rolling thunder,
  Thy power throughout the universe displayed!
  
  Then sings my soul, my Savior God, to Thee,
  How great Thou art! How great Thou art!
  Then sings my soul, my Savior God, to Thee,
  How great Thou art! How great Thou art!',
  'Ee Bwana Mungu wangu, nikishangaa
  Kuangalia kazi za mikono yako,
  Nyota na radi zinazovuma,
  Nguvu zako kote ulimwenguni!
  
  Kisha roho yangu na ikuimbie,
  Wewe ni mkuu, jinsi gani mkuu!
  Kisha roho yangu na ikuimbie,
  Wewe ni mkuu, jinsi gani mkuu!',
  'Ee Ruoth Nyasacha, ka aparo duto
  Tije mag lwetegi masechweyo,
  Aseno sulwe, awinjo mor polo,
  Teko mari osefweny piny duto!
  
  Chunyna to wer, Ruoth Nyasacha maber,
  En dichuo maduong''! En dichuo maduong''!
  Chunyna to wer, Ruoth Nyasacha maber,
  En dichuo maduong''! En dichuo maduong''!'),
  
          (3, 3, 'What a Friend We Have in Jesus / Rafiki wa Kweli ni Yesu / Osiep Mabye En Yesu', 'F', 'Prayer & Trust',
  'What a friend we have in Jesus,
  All our sins and griefs to bear!
  What a privilege to carry
  Everything to God in prayer!
  Oh, what peace we often forfeit,
  Oh, what needless pain we bear,
  All because we do not carry
  Everything to God in prayer!',
  'Rafiki mwema ni Yesu,
  Abebeaye dhambi zetu zote!
  Ni heri iliyoje kwetu
  Kupeleka yote kwa Mungu kwa maombi!
  Amani gani twajikosesha,
  Maumivu gani ya bure twabeba,
  Yote kwa sababu hatupeleki
  Kila kitu kwa Mungu kwa maombi!',
  'Osiep maber maradiri en Yesu,
  Mating''o richo kendo parruokwa duto!
  En heri maduong'' malich nwa
  Kwalo wechewa duto ne Nyasaye!
  O, kuwe maduong'' ma wapendorego,
  Kendo chunywa thagore nono,
  Nikech waongeyo kuom Nyasaye
  Wechewa duto duto e lamo!')
        `);
      }
    } catch (err) {
      console.error('Seeding hymns failed:', err);
    }
  }

  // Reset sequences for PostgreSQL after seeding explicit IDs
  if (db instanceof PostgresCompatDatabase) {
    const tables = [
      'branches',
      'cell_groups',
      'members',
      'contributions',
      'expenditures',
      'attendance_sessions',
      'attendance_records',
      'events',
      'sermons',
      'hymns',
      'system_backups',
      'tasks',
      'users'
    ];
    for (const table of tables) {
      try {
        await db.get(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT max(id) FROM ${table}), 1), true)`);
      } catch (seqErr) {
        // Table might not have id or serial, ignore
      }
    }
  }

  // Safe migration for expenditures status column
  try {
    await db.run("ALTER TABLE expenditures ADD COLUMN status TEXT NOT NULL DEFAULT 'Approved'");
  } catch (err) {
    // Column already exists, ignore
  }

  // Safe migration for members reg_number column
  try {
    await db.run("ALTER TABLE members ADD COLUMN reg_number TEXT");
  } catch (err) {
    // Column already exists, ignore
  }

  // Safe migration for contributions cell_group_id column
  try {
    await db.run("ALTER TABLE contributions ADD COLUMN cell_group_id INTEGER");
  } catch (err) {
    // Column already exists, ignore
  }

  // Assign sequential registration numbers to any members who don't have one yet
  try {
    const membersWithoutReg = await db.all("SELECT id FROM members WHERE reg_number IS NULL OR reg_number = '' ORDER BY id ASC");
    if (membersWithoutReg.length > 0) {
      const allMembers = await db.all("SELECT id, reg_number FROM members ORDER BY id ASC");
      let maxNum = 0;
      for (const m of allMembers) {
        if (m.reg_number) {
          const num = parseInt(m.reg_number, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      
      for (const m of membersWithoutReg) {
        maxNum++;
        const nextReg = String(maxNum).padStart(3, '0');
        await db.run("UPDATE members SET reg_number = ? WHERE id = ?", [nextReg, m.id]);
      }
      console.log(`Assigned sequential registration numbers to ${membersWithoutReg.length} members starting from ${String(maxNum - membersWithoutReg.length + 1).padStart(3, '0')}`);
    }
  } catch (regBackfillErr) {
    console.error('Warning: Backfilling registration numbers encountered an error:', regBackfillErr);
  }

  // Create prayer_requests and bulk_sms tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prayer_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      requestor_name TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      is_anonymous INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bulk_sms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      message TEXT NOT NULL,
      recipients TEXT
    );

    CREATE TABLE IF NOT EXISTS bible_chapters_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      translation TEXT NOT NULL,
      verses_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book, chapter, translation)
    );

    CREATE TABLE IF NOT EXISTS bible_search_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      translation TEXT NOT NULL,
      results_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(query, translation)
    );
  `);

  // Seed default bible cache for Genesis 1 to prevent immediate quota usage on page load
  try {
    if (!alreadySeeded) {
      const genesisEsv = JSON.stringify([
        {"verse": 1, "text": "In the beginning, God created the heavens and the earth."},
        {"verse": 2, "text": "The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters."},
        {"verse": 3, "text": "And God said, 'Let there be light,' and there was light."},
        {"verse": 4, "text": "And God saw that the light was good. And God separated the light from the darkness."},
        {"verse": 5, "text": "God called the light Day, and the darkness he called Night. And there was evening and there was morning, the first day."}
      ]);

      const genesisSwahili = JSON.stringify([
        {"verse": 1, "text": "Hapo mwanzo Mungu aliziumba mbingu na nchi."},
        {"verse": 2, "text": "Nayo nchi ilikuwa ukiwa, tena utupu, na giza lilikuwa juu ya uso wa vilindi vya maji; Roho ya Mungu ikatulia juu ya uso wa maji."},
        {"verse": 3, "text": "Mungu akasema, 'Iwe nuru'; ikawa nuru."},
        {"verse": 4, "text": "Mungu akaiona nuru, ya kuwa ni njema; Mungu akatenga nuru na giza."},
        {"verse": 5, "text": "Mungu akaiita nuru Mchana, na giza akaliita Usiku. Ikawa jioni ikawa asubuhi, siku ya kwanza."}
      ]);

      const genesisLuo = JSON.stringify([
        {"verse": 1, "text": "E chakruok Nyasaye nochweyo polo gi piny."},
        {"verse": 2, "text": "Piny ne onge gi kido kendo ne otimo thuolo, kendo mudo ne oimo bwoye duto mapiny, to Roho mar Nyasaye ne huyo kuom pi."},
        {"verse": 3, "text": "Nyasaye nowacho kama, 'Nuru maber obedoe,' omiyo nuru nobedoe."},
        {"verse": 4, "text": "Nyasaye neon nuru ni ber; omiyo nopogo nuru gi mudo."},
        {"verse": 5, "text": "Nyasaye noluongo nuru ni Odiechieng', to mudo noluongo ni Otieno. Ne otieno kendo ne okinyi, odiechieng' mokuongo."}
      ]);

      await db.run(`INSERT OR IGNORE INTO bible_chapters_cache (book, chapter, translation, verses_json) VALUES 
        ('Genesis', 1, 'esv', ?),
        ('Genesis', 1, 'swahili', ?),
        ('Genesis', 1, 'luo', ?)
      `, genesisEsv, genesisSwahili, genesisLuo);
    }
  } catch (seedErr) {
    console.error('Failed to seed bible cache:', seedErr);
  }

  // 12. Run Automatic Database De-duplication on startup to clean up any past accumulated duplicates
  console.log('Initiating automatic database de-duplication check...');
  const deduplicateTables = [
    {
      table: 'expenditures',
      groupBy: 'category, amount, date, description'
    },
    {
      table: 'tasks',
      groupBy: 'title, description, assigned_to, due_date, status, category'
    },
    {
      table: 'contributions',
      groupBy: 'member_id, member_name, amount, type, date, payment_method'
    },
    {
      table: 'members',
      groupBy: 'name, contact, join_date, status, gender, family_role, birth_date, branch_id, cell_group_id'
    },
    {
      table: 'branches',
      groupBy: 'name, location, pastor, date_opened'
    },
    {
      table: 'cell_groups',
      groupBy: 'name, leader, meeting_details, branch_id'
    },
    {
      table: 'events',
      groupBy: 'title, description, date, location'
    },
    {
      table: 'sermons',
      groupBy: 'title, speaker, date, summary, media_url'
    },
    {
      table: 'hymns',
      groupBy: 'number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo'
    },
    {
      table: 'attendance_sessions',
      groupBy: 'date, service_name, branch_id'
    },
    {
      table: 'attendance_records',
      groupBy: 'session_id, member_id, status'
    }
  ];

  for (const item of deduplicateTables) {
    try {
      await db.run(`
        DELETE FROM ${item.table}
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM ${item.table}
          GROUP BY ${item.groupBy}
        )
      `);
    } catch (dedupErr) {
      console.error(`De-duplication of table ${item.table} failed:`, dedupErr);
    }
  }
  console.log('Database de-duplication process complete.');
}
