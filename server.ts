import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb, getDbType, generateNextRegNumber } from './server/db.js';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

// Enable CORS for cross-origin frontend requests (e.g., when hosted on Cloudflare Pages)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// API ROUTES
// 1. Stats Endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const db = await getDb();

    const memberCountRes = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM members WHERE status = 'Active'");
    const memberCount = memberCountRes?.count ?? 0;

    const totalContribsRes = await db.get<{ total: number }>('SELECT SUM(amount) as total FROM contributions');
    const totalContributions = totalContribsRes?.total ?? 0;

    const totalExpRes = await db.get<{ total: number }>('SELECT SUM(amount) as total FROM expenditures');
    const totalExpenditures = totalExpRes?.total ?? 0;

    const branchesCountRes = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM branches');
    const branchesCount = branchesCountRes?.count ?? 0;

    const cellGroupsCountRes = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM cell_groups');
    const cellGroupsCount = cellGroupsCountRes?.count ?? 0;

    const netBalance = totalContributions - totalExpenditures;

    // Attendance trends
    const attendanceTrend = await db.all(`
      SELECT s.id, s.date, s.service_name, b.name as branch_name,
             SUM(CASE WHEN r.status = 'Present' THEN 1 ELSE 0 END) as present_count,
             COUNT(r.id) as total_count
      FROM attendance_sessions s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN attendance_records r ON s.id = r.session_id
      GROUP BY s.id, s.date, s.service_name, b.name
      ORDER BY s.date ASC
      LIMIT 10
    `);

    // Donation by Type
    const donationByType = await db.all(`
      SELECT type as name, SUM(amount) as value 
      FROM contributions 
      GROUP BY type
    `);

    // Expense by Category
    const expenseByCategory = await db.all(`
      SELECT category as name, SUM(amount) as value 
      FROM expenditures 
      GROUP BY category
    `);

    // Recent activities
    const recentMembers = await db.all(`
      SELECT m.*, b.name as branch_name 
      FROM members m 
      LEFT JOIN branches b ON m.branch_id = b.id 
      ORDER BY m.id DESC 
      LIMIT 5
    `);

    const recentContributions = await db.all(`
      SELECT c.*, m.name as member_name 
      FROM contributions c 
      LEFT JOIN members m ON c.member_id = m.id 
      ORDER BY c.id DESC 
      LIMIT 5
    `);

    res.json({
      memberCount,
      totalContributions,
      totalExpenditures,
      netBalance,
      branchesCount,
      cellGroupsCount,
      attendanceTrend,
      donationByType,
      expenseByCategory,
      recentMembers,
      recentContributions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Members Endpoints
app.get('/api/members', async (req, res) => {
  try {
    const db = await getDb();
    const members = await db.all(`
      SELECT m.*, b.name as branch_name, c.name as cell_group_name
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN cell_groups c ON m.cell_group_id = c.id
      ORDER BY m.name ASC
    `);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const db = await getDb();
    const { name, contact, join_date, status, gender, family_role, birth_date, branch_id, cell_group_id } = req.body;
    
    if (!name || !contact) {
      return res.status(400).json({ error: 'Name and Contact are required' });
    }

    // Determine the next registration number starting from '001' using sequence generator
    const nextRegNum = await generateNextRegNumber(db);

    const result = await db.run(`
      INSERT INTO members (name, contact, join_date, status, gender, family_role, birth_date, branch_id, cell_group_id, reg_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, contact, join_date || new Date().toISOString().split('T')[0], status || 'Active', gender || 'Male', family_role || 'Single', birth_date || '', branch_id || null, cell_group_id || null, nextRegNum]);
    
    res.status(201).json({ id: result.lastID, reg_number: nextRegNum });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { name, contact, join_date, status, gender, family_role, birth_date, branch_id, cell_group_id } = req.body;

    await db.run(`
      UPDATE members
      SET name = ?, contact = ?, join_date = ?, status = ?, gender = ?, family_role = ?, birth_date = ?, branch_id = ?, cell_group_id = ?
      WHERE id = ?
    `, [name, contact, join_date, status, gender, family_role, birth_date, branch_id || null, cell_group_id || null, id]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM members WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for deletion' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM members WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members/import', async (req, res) => {
  try {
    const db = await getDb();
    const list = req.body; // Expects JSON array of items
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected an array of member records' });
    }

    const nextRegNumStr = await generateNextRegNumber(db);
    let currentSeqNum = parseInt(nextRegNumStr, 10);
    if (isNaN(currentSeqNum)) {
      currentSeqNum = 1;
    }

    await db.run('BEGIN TRANSACTION');
    for (const item of list) {
      let regNum = item.reg_number;
      if (!regNum) {
        regNum = String(currentSeqNum).padStart(3, '0');
        currentSeqNum++;
      }
      await db.run(`
        INSERT INTO members (name, contact, join_date, status, gender, family_role, birth_date, branch_id, cell_group_id, reg_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.name, 
        item.contact || '', 
        item.join_date || new Date().toISOString().split('T')[0], 
        item.status || 'Active', 
        item.gender || 'Male', 
        item.family_role || 'Single', 
        item.birth_date || '', 
        item.branch_id || null, 
        item.cell_group_id || null,
        regNum
      ]);
    }
    await db.run('COMMIT');
    res.json({ success: true, count: list.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Contributions Endpoints
app.get('/api/contributions', async (req, res) => {
  try {
    const db = await getDb();
    const contributions = await db.all(`
      SELECT c.*, m.name as member_name, b.name as branch_name,
             COALESCE(cg.name, cg_member.name) as cell_group_name
      FROM contributions c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN cell_groups cg ON c.cell_group_id = cg.id
      LEFT JOIN cell_groups cg_member ON m.cell_group_id = cg_member.id
      ORDER BY c.date DESC
    `);
    res.json(contributions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contributions', async (req, res) => {
  try {
    const db = await getDb();
    const { member_id, member_name, amount, type, date, payment_method, cell_group_id } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const result = await db.run(`
      INSERT INTO contributions (member_id, member_name, amount, type, date, payment_method, cell_group_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [member_id || null, member_name || 'Anonymous', amount, type || 'Tithe', date || new Date().toISOString().split('T')[0], payment_method || 'M-Pesa', cell_group_id || null]);

    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contributions/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { member_id, member_name, amount, type, date, payment_method, cell_group_id } = req.body;

    await db.run(`
      UPDATE contributions
      SET member_id = ?, member_name = ?, amount = ?, type = ?, date = ?, payment_method = ?, cell_group_id = ?
      WHERE id = ?
    `, [member_id || null, member_name || 'Anonymous', amount, type, date, payment_method, cell_group_id || null, id]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contributions/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM contributions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contributions/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for deletion' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM contributions WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contributions/import', async (req, res) => {
  try {
    const db = await getDb();
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected an array of contribution records' });
    }

    await db.run('BEGIN TRANSACTION');
    for (const item of list) {
      await db.run(`
        INSERT INTO contributions (member_id, member_name, amount, type, date, payment_method, cell_group_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        item.member_id || null, 
        item.member_name || 'Anonymous', 
        item.amount || 0, 
        item.type || 'Tithe', 
        item.date || new Date().toISOString().split('T')[0], 
        item.payment_method || 'M-Pesa',
        item.cell_group_id || null
      ]);
    }
    await db.run('COMMIT');
    res.json({ success: true, count: list.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Expenditures Endpoints
app.get('/api/expenditures', async (req, res) => {
  try {
    const db = await getDb();
    const expenditures = await db.all('SELECT * FROM expenditures ORDER BY date DESC');
    res.json(expenditures);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenditures', async (req, res) => {
  try {
    const db = await getDb();
    const { category, amount, date, description, status } = req.body;
    if (!amount || !category) {
      return res.status(400).json({ error: 'Amount and Category are required' });
    }
    const result = await db.run(`
      INSERT INTO expenditures (category, amount, date, description, status)
      VALUES (?, ?, ?, ?, ?)
    `, [category, amount, date || new Date().toISOString().split('T')[0], description || '', status || 'Pending']);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenditures/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { category, amount, date, description, status } = req.body;
    await db.run(`
      UPDATE expenditures
      SET category = ?, amount = ?, date = ?, description = ?, status = ?
      WHERE id = ?
    `, [category, amount, date, description, status || 'Pending', id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenditures/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM expenditures WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenditures/import', async (req, res) => {
  try {
    const db = await getDb();
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected an array of expenditure records' });
    }

    await db.run('BEGIN TRANSACTION');
    for (const item of list) {
      await db.run(`
        INSERT INTO expenditures (category, amount, date, description, status)
        VALUES (?, ?, ?, ?, ?)
      `, [
        item.category || 'Other', 
        item.amount || 0, 
        item.date || new Date().toISOString().split('T')[0], 
        item.description || '',
        item.status || 'Approved'
      ]);
    }
    await db.run('COMMIT');
    res.json({ success: true, count: list.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Branches Endpoints
app.get('/api/branches', async (req, res) => {
  try {
    const db = await getDb();
    const branches = await db.all('SELECT * FROM branches ORDER BY name ASC');
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/branches', async (req, res) => {
  try {
    const db = await getDb();
    const { name, location, pastor, date_opened } = req.body;
    const result = await db.run(`
      INSERT INTO branches (name, location, pastor, date_opened)
      VALUES (?, ?, ?, ?)
    `, [name, location, pastor, date_opened || new Date().toISOString().split('T')[0]]);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { name, location, pastor, date_opened } = req.body;
    await db.run(`
      UPDATE branches
      SET name = ?, location = ?, pastor = ?, date_opened = ?
      WHERE id = ?
    `, [name, location, pastor, date_opened, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/branches/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM branches WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Cell Groups Endpoints
app.get('/api/cell_groups', async (req, res) => {
  try {
    const db = await getDb();
    const cellGroups = await db.all(`
      SELECT cg.*, b.name as branch_name
      FROM cell_groups cg
      LEFT JOIN branches b ON cg.branch_id = b.id
      ORDER BY cg.name ASC
    `);
    res.json(cellGroups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cell_groups', async (req, res) => {
  try {
    const db = await getDb();
    const { name, leader, meeting_details, branch_id } = req.body;
    const result = await db.run(`
      INSERT INTO cell_groups (name, leader, meeting_details, branch_id)
      VALUES (?, ?, ?, ?)
    `, [name, leader, meeting_details, branch_id || null]);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cell_groups/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { name, leader, meeting_details, branch_id } = req.body;
    await db.run(`
      UPDATE cell_groups
      SET name = ?, leader = ?, meeting_details = ?, branch_id = ?
      WHERE id = ?
    `, [name, leader, meeting_details, branch_id || null, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cell_groups/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM cell_groups WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Events Endpoints
app.get('/api/events', async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all('SELECT * FROM events ORDER BY date ASC');
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const db = await getDb();
    const { title, description, date, location } = req.body;
    const result = await db.run(`
      INSERT INTO events (title, description, date, location)
      VALUES (?, ?, ?, ?)
    `, [title, description, date, location]);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { title, description, date, location } = req.body;
    await db.run(`
      UPDATE events
      SET title = ?, description = ?, date = ?, location = ?
      WHERE id = ?
    `, [title, description, date, location, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Sermons Endpoints
app.get('/api/sermons', async (req, res) => {
  try {
    const db = await getDb();
    const sermons = await db.all('SELECT * FROM sermons ORDER BY date DESC');
    res.json(sermons);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sermons', async (req, res) => {
  try {
    const db = await getDb();
    const { title, speaker, date, summary, media_url } = req.body;
    const result = await db.run(`
      INSERT INTO sermons (title, speaker, date, summary, media_url)
      VALUES (?, ?, ?, ?, ?)
    `, [title, speaker, date, summary, media_url]);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sermons/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { title, speaker, date, summary, media_url } = req.body;
    await db.run(`
      UPDATE sermons
      SET title = ?, speaker = ?, date = ?, summary = ?, media_url = ?
      WHERE id = ?
    `, [title, speaker, date, summary, media_url, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sermons/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM sermons WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Hymns Endpoints
app.get('/api/hymns', async (req, res) => {
  try {
    const db = await getDb();
    const hymns = await db.all('SELECT * FROM hymns ORDER BY number ASC');
    res.json(hymns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hymns', async (req, res) => {
  try {
    const db = await getDb();
    const { number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo } = req.body;
    const result = await db.run(`
      INSERT INTO hymns (number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo]);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hymns/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo } = req.body;
    await db.run(`
      UPDATE hymns
      SET number = ?, title = ?, key = ?, category = ?, lyrics_english = ?, lyrics_kiswahili = ?, lyrics_luo = ?
      WHERE id = ?
    `, [number, title, key, category, lyrics_english, lyrics_kiswahili, lyrics_luo, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hymns/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM hymns WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9.5 Global Settings Endpoints
app.get('/api/settings/:key', async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT value FROM settings WHERE key = ?', [req.params.key]);
    res.json({ value: row ? row.value : null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const db = await getDb();
    const { key, value } = req.body;
    const existing = await db.get('SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
    } else {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Attendance Sessions & Records Endpoints
app.get('/api/attendance/sessions', async (req, res) => {
  try {
    const db = await getDb();
    const sessions = await db.all(`
      SELECT s.*, b.name as branch_name,
             COUNT(r.id) as total_members,
             SUM(CASE WHEN r.status = 'Present' THEN 1 ELSE 0 END) as present_count
      FROM attendance_sessions s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN attendance_records r ON s.id = r.session_id
      GROUP BY s.id, b.name
      ORDER BY s.date DESC
    `);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/records/:sessionId', async (req, res) => {
  try {
    const db = await getDb();
    const records = await db.all(`
      SELECT r.id, r.member_id, m.name as member_name, r.status
      FROM attendance_records r
      JOIN members m ON r.member_id = m.id
      WHERE r.session_id = ?
    `, [req.params.sessionId]);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/sessions', async (req, res) => {
  try {
    const db = await getDb();
    const { date, service_name, branch_id, records } = req.body;

    if (!date || !service_name || !branch_id || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing required session parameters' });
    }

    await db.run('BEGIN TRANSACTION');

    const sessionResult = await db.run(`
      INSERT INTO attendance_sessions (date, service_name, branch_id)
      VALUES (?, ?, ?)
    `, [date, service_name, branch_id]);

    const sessionId = sessionResult.lastID;

    for (const record of records) {
      await db.run(`
        INSERT INTO attendance_records (session_id, member_id, status)
        VALUES (?, ?, ?)
      `, [sessionId, record.member_id, record.status]);
    }

    await db.run('COMMIT');

    res.status(201).json({ id: sessionId });
  } catch (error: any) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/attendance/records/:sessionId', async (req, res) => {
  try {
    const db = await getDb();
    const sessionId = req.params.sessionId;
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Expected records array' });
    }

    await db.run('BEGIN TRANSACTION');

    for (const record of records) {
      await db.run(`
        UPDATE attendance_records
        SET status = ?
        WHERE session_id = ? AND member_id = ?
      `, [record.status, sessionId, record.member_id]);
    }

    await db.run('COMMIT');

    res.json({ success: true });
  } catch (error: any) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/attendance/sessions/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    await db.run('DELETE FROM attendance_sessions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Member financial statements
app.get('/api/members/:id/statement', async (req, res) => {
  try {
    const db = await getDb();
    const memberId = req.params.id;

    const member = await db.get(`
      SELECT m.*, b.name as branch_name, c.name as cell_group_name
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN cell_groups c ON m.cell_group_id = c.id
      WHERE m.id = ?
    `, [memberId]);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const contributions = await db.all(`
      SELECT * FROM contributions 
      WHERE member_id = ? 
      ORDER BY date DESC
    `, [memberId]);

    const totalContributionsRes = await db.get<{ total: number }>(`
      SELECT SUM(amount) as total FROM contributions WHERE member_id = ?
    `, [memberId]);

    res.json({
      member,
      contributions,
      total: totalContributionsRes?.total ?? 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 11. Backups Endpoints
app.get('/api/backups/latest', async (req, res) => {
  try {
    const db = await getDb();
    const latest = await db.get<{ timestamp: string }>('SELECT timestamp FROM system_backups ORDER BY id DESC LIMIT 1');
    res.json({ timestamp: latest?.timestamp || 'Never' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/trigger', async (req, res) => {
  try {
    const db = await getDb();
    const formatter = new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const nowParts = formatter.formatToParts(new Date());
    const year = nowParts.find(p => p.type === 'year')?.value;
    const month = nowParts.find(p => p.type === 'month')?.value;
    const day = nowParts.find(p => p.type === 'day')?.value;
    const hour = nowParts.find(p => p.type === 'hour')?.value;
    const minute = nowParts.find(p => p.type === 'minute')?.value;
    const second = nowParts.find(p => p.type === 'second')?.value;
    const timestamp = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    await db.run('INSERT INTO system_backups (timestamp) VALUES (?)', [timestamp]);
    res.json({ success: true, timestamp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Tasks Endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all('SELECT * FROM tasks ORDER BY id DESC');
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const db = await getDb();
    const { title, description, assigned_to, due_date, status, category } = req.body;
    if (!title || !assigned_to || !due_date || !category) {
      return res.status(400).json({ error: 'Title, assigned_to, due_date, and category are required' });
    }
    const result = await db.run(`
      INSERT INTO tasks (title, description, assigned_to, due_date, status, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description || '', assigned_to, due_date, status || 'Pending', category || 'Other']);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { title, description, assigned_to, due_date, status, category } = req.body;
    await db.run(`
      UPDATE tasks
      SET title = ?, description = ?, assigned_to = ?, due_date = ?, status = ?, category = ?
      WHERE id = ?
    `, [title, description, assigned_to, due_date, status, category, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Prayer Requests Endpoints
app.get('/api/prayer-requests', async (req, res) => {
  try {
    const db = await getDb();
    const requests = await db.all('SELECT * FROM prayer_requests ORDER BY id DESC');
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prayer-requests', async (req, res) => {
  try {
    const db = await getDb();
    const { requestor_name, content, is_anonymous } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const result = await db.run(`
      INSERT INTO prayer_requests (date, requestor_name, content, status, is_anonymous)
      VALUES (?, ?, ?, 'Pending', ?)
    `, [
      new Date().toISOString().split('T')[0],
      is_anonymous ? null : (requestor_name || 'Anonymous'),
      content,
      is_anonymous ? 1 : 0
    ]);
    res.status(201).json({ id: result.lastID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/prayer-requests/:id/status', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { status } = req.body;
    await db.run('UPDATE prayer_requests SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/prayer-requests/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM prayer_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Bulk SMS Endpoints
app.get('/api/bulk-sms', async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM bulk_sms ORDER BY id DESC');
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bulk-sms', async (req, res) => {
  try {
    const db = await getDb();
    const { sender, message, recipients } = req.body;
    if (!message || !recipients) {
      return res.status(400).json({ error: 'Message and recipients are required' });
    }
    
    const recipientListStr = Array.isArray(recipients) ? recipients.join(', ') : recipients;
    const recipientArray = Array.isArray(recipients) 
      ? recipients 
      : recipients.split(',').map((r: string) => r.trim()).filter(Boolean);
    const recipientCount = recipientArray.length;

    // TalkSasa SMS Gateway Integration
    const talkSasaApiKey = process.env.TALKSASA_API_KEY;
    const talkSasaSenderId = process.env.TALKSASA_SENDER_ID || sender || 'GIMK';

    let smsSuccess = false;
    let smsDetails = '';

    if (talkSasaApiKey && talkSasaApiKey !== 'MY_TALKSASA_API_KEY' && talkSasaApiKey.trim() !== '') {
      try {
        console.log(`[TalkSasa SMS] Initiating bulk send for ${recipientCount} recipients...`);
        
        // Map promises to send to each recipient to ensure separate tracking and delivery status
        const sendPromises = recipientArray.map(async (phone: string) => {
          try {
            const response = await fetch('https://api.talksasa.com/v1/sms/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${talkSasaApiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                sender_id: talkSasaSenderId,
                phone: phone,
                message: message
              })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              return { phone, success: false, error: data.message || `HTTP ${response.status}` };
            }
            return { phone, success: true, id: data.id || data.message_id };
          } catch (err: any) {
            return { phone, success: false, error: err.message };
          }
        });

        const results = await Promise.all(sendPromises);
        const successfulSends = results.filter(r => r.success);
        smsSuccess = successfulSends.length > 0;
        smsDetails = JSON.stringify(results);
        console.log(`[TalkSasa SMS] Bulk send finished. Success: ${successfulSends.length}/${recipientCount}`);
      } catch (smsErr: any) {
        console.error('[TalkSasa SMS Error] Failed to send bulk SMS via TalkSasa:', smsErr.message);
        smsDetails = `Error: ${smsErr.message}`;
      }
    } else {
      console.log(`[TalkSasa SMS Simulation] TALKSASA_API_KEY not found or is default. Simulating delivery to: ${recipientListStr}`);
      smsSuccess = true;
      smsDetails = 'Simulated delivery (TALKSASA_API_KEY missing)';
    }

    const result = await db.run(`
      INSERT INTO bulk_sms (date, sender, recipient_count, message, recipients)
      VALUES (?, ?, ?, ?, ?)
    `, [
      new Date().toISOString().split('T')[0],
      talkSasaSenderId,
      recipientCount,
      message,
      recipientListStr
    ]);

    res.status(201).json({ 
      id: result.lastID, 
      success: true, 
      count: recipientCount,
      smsSuccess,
      smsDetails
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Generic Restore endpoint for staging cache/undo action
app.post('/api/restore', async (req, res) => {
  try {
    const db = await getDb();
    const { table, records } = req.body;
    if (!table || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Invalid restore request' });
    }
    
    await db.run('BEGIN TRANSACTION');
    for (const record of records) {
      const keys = Object.keys(record);
      const values = Object.values(record);
      const columns = keys.join(',');
      const placeholders = keys.map(() => '?').join(',');
      await db.run(`INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`, values);
    }
    await db.run('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete Expenditures
app.post('/api/expenditures/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM expenditures WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete Branches
app.post('/api/branches/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM branches WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete Cell Groups
app.post('/api/cell_groups/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM cell_groups WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Delete Attendance Sessions
app.post('/api/attendance/sessions/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM attendance_sessions WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Status Updates for Members
app.post('/api/members/bulk-status', async (req, res) => {
  try {
    const db = await getDb();
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ error: 'Invalid update parameters' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`UPDATE members SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Status Updates for Expenditures
app.post('/api/expenditures/bulk-status', async (req, res) => {
  try {
    const db = await getDb();
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ error: 'Invalid update parameters' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`UPDATE expenditures SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Status Updates for Prayer Requests
app.post('/api/prayer-requests/bulk-status', async (req, res) => {
  try {
    const db = await getDb();
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ error: 'Invalid update parameters' });
    }
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`UPDATE prayer_requests SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 12. User Authentication Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const db = await getDb();
    const { username, password, role, invitationPassword } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    if (role === 'admin') {
      if (invitationPassword !== 'admin123') {
        return res.status(400).json({ error: 'Invalid admin passcode. Access denied.' });
      }
    } else if (role === 'pastor' || role === 'usher') {
      if (invitationPassword !== 'password123') {
        return res.status(400).json({ error: 'Invalid official church passcode. Access denied.' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    // Check if username already exists
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Insert user
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );

    res.status(201).json({ success: true, user: { username, role } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const db = await getDb();
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?',
      [username, password, role]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username, password, or role selection' });
    }

    res.json({ success: true, user: { username: user.username, role: user.role } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const db = await getDb();
    const { username, oldPassword, newPassword, role } = req.body;

    if (!username || !oldPassword || !newPassword || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?',
      [username, oldPassword, role]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    await db.run(
      'UPDATE users SET password = ? WHERE username = ? AND role = ?',
      [newPassword, username, role]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 15. Database Status and Reset Endpoints
app.get('/api/database/status', async (req, res) => {
  try {
    const type = getDbType();
    const isPersistent = type === 'postgresql' || type === 'cloudsql';
    let details = 'Local Ephemeral SQLite (Development / Ephemeral)';
    if (type === 'postgresql') {
      details = 'Production PostgreSQL Database (Persistent)';
    } else if (type === 'cloudsql') {
      details = 'Production Cloud SQL Instance (Persistent)';
    }
    res.json({
      type,
      persistent: isPersistent,
      details
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/reset', async (req, res) => {
  try {
    const db = await getDb();
    
    // Purge tables in the correct order to respect foreign key constraints
    await db.run('BEGIN');
    try {
      const tablesInOrder = [
        'attendance_records',
        'attendance_sessions',
        'contributions',
        'tasks',
        'prayer_requests',
        'bulk_sms',
        'expenditures',
        'events',
        'sermons',
        'hymns',
        'system_backups',
        'bible_chapters_cache',
        'bible_search_cache',
        'members',
        'cell_groups',
        'branches'
      ];
      
      for (const table of tablesInOrder) {
        await db.run(`DELETE FROM ${table}`);
      }
      await db.run('COMMIT');
    } catch (txErr) {
      try {
        await db.run('ROLLBACK');
      } catch (_) {}
      throw txErr;
    }

    res.json({ success: true, message: 'Database reset successfully. All transactions and demo records cleared.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust wrapper with retries and exponential backoff
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || '';
      const isTimeoutOrFetch = errMsg.includes('fetch failed') || 
                           errMsg.includes('Timeout') || 
                           errMsg.includes('429') || 
                           errMsg.includes('quota') ||
                           err.name === 'HeadersTimeoutError';
      if (isTimeoutOrFetch && i < retries - 1) {
        console.warn(`Gemini call failed (attempt ${i + 1}/${retries}): ${errMsg}. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 1.5; // Backoff
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Holy Bible Endpoints (ESV, Luo, Swahili Translations via Gemini)
app.get('/api/bible/chapter', async (req, res) => {
  const { book, chapter, translation } = req.query;
  const bookStr = String(book || 'Genesis');
  const chapterNum = Number(chapter || 1);
  const transStr = String(translation || 'esv').toLowerCase();

  try {
    if (!book || !chapter || !translation) {
      return res.status(400).json({ error: 'Book, chapter, and translation are required' });
    }

    // Check DB Cache first
    const db = await getDb();
    const cached = await db.get<{ verses_json: string }>(
      'SELECT verses_json FROM bible_chapters_cache WHERE LOWER(book) = ? AND chapter = ? AND LOWER(translation) = ?',
      bookStr.toLowerCase(),
      chapterNum,
      transStr
    );

    if (cached?.verses_json) {
      try {
        const verses = JSON.parse(cached.verses_json);
        return res.json({ success: true, verses });
      } catch (jsonErr) {
        console.warn('Stale/corrupt cached JSON in DB. Re-fetching from Gemini...', jsonErr);
      }
    }

    const ai = getGeminiClient();
    let translationName = "English Standard Version (ESV)";
    if (transStr === 'luo') {
      translationName = "Luo Bible (Muma Maler)";
    } else if (transStr === 'swahili') {
      translationName = "Swahili Bible (Kiswahili Union Version / Habari Njema / Kiswahili ya Muungano)";
    }

    const prompt = `Please provide the verses for ${bookStr} Chapter ${chapterNum} in the ${translationName} translation (or a very close, accurate public-domain equivalent like World English Bible if copyrighted) of the Holy Bible. Format each verse clearly as requested in JSON.`;

    const response = await callGeminiWithRetry(() => 
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional bible concordance and scripture provider. Your task is to output the list of verses for the requested book, chapter, and translation (or a close public-domain equivalent if the specific translation is copyrighted or restricted, to ensure successful delivery of the scriptures). Be complete and faithful to the spirit and meaning of the scriptures. Output only as a JSON array where each item has 'verse' (number) and 'text' (string).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                verse: {
                  type: Type.INTEGER,
                  description: "The verse number (e.g. 1)."
                },
                text: {
                  type: Type.STRING,
                  description: "The text of the verse in the target translation."
                }
              },
              required: ["verse", "text"]
            }
          }
        }
      })
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from the Gemini API");
    }

    const verses = JSON.parse(text);

    // Save to DB Cache asynchronously
    db.run(
      'INSERT OR REPLACE INTO bible_chapters_cache (book, chapter, translation, verses_json) VALUES (?, ?, ?, ?)',
      bookStr,
      chapterNum,
      transStr,
      JSON.stringify(verses)
    ).catch(err => console.error('Failed to cache bible chapter in DB:', err));

    res.json({ success: true, verses });
  } catch (error: any) {
    console.error("Bible fetch error:", error);
    // Graceful fallback to avoid applet error screen
    const fallbackVerses = [
      {
        verse: 1,
        text: `[Service Alert] The Bible translation service is temporarily busy or rate-limited (${error.message || 'Connection Timeout'}). We have automatically enabled this offline backup message so you can continue using the app.`
      },
      {
        verse: 2,
        text: `Tip: Selected chapters like "Genesis 1" are preloaded offline and will load instantly! You can also check out our preloaded Hymnal, Sermons, and other resources on the dashboard.`
      },
      {
        verse: 3,
        text: `Please try reloading this chapter in a few seconds once the connection clears up. God bless you!`
      }
    ];
    res.json({ success: true, verses: fallbackVerses, isFallback: true });
  }
});

app.get('/api/bible/search', async (req, res) => {
  const { query, translation } = req.query;
  const queryStr = String(query || '').trim();
  const transStr = String(translation || 'esv').toLowerCase();

  try {
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check DB Cache first
    const db = await getDb();
    const cached = await db.get<{ results_json: string }>(
      'SELECT results_json FROM bible_search_cache WHERE LOWER(query) = ? AND LOWER(translation) = ?',
      queryStr.toLowerCase(),
      transStr
    );

    if (cached?.results_json) {
      try {
        const results = JSON.parse(cached.results_json);
        return res.json({ success: true, results });
      } catch (jsonErr) {
        console.warn('Stale/corrupt cached search results in DB. Re-fetching...', jsonErr);
      }
    }

    const ai = getGeminiClient();
    let translationName = "English Standard Version (ESV)";
    if (transStr === 'luo') {
      translationName = "Luo Bible (Muma Maler)";
    } else if (transStr === 'swahili') {
      translationName = "Swahili Bible (Kiswahili Union Version / Habari Njema)";
    }

    const prompt = `Search the scriptures in the "${translationName}" translation (or close public domain equivalents) of the Holy Bible for verses matching or relevant to the query: "${queryStr}". Retrieve the top 12 most relevant matching verses.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a biblical concordance search engine. Search the scriptures and return relevant verses matching the user's query in the specified translation (or close public-domain equivalents if the specified translation is copyrighted). Output only as structured JSON matching the requested schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                reference: {
                  type: Type.STRING,
                  description: "The full scripture reference, e.g., 'Romans 8:28' or 'John 3:16'."
                },
                text: {
                  type: Type.STRING,
                  description: "The verbatim text of the verse in the target language translation."
                },
                theme: {
                  type: Type.STRING,
                  description: "A short 1-2 word theme category for this verse (e.g. Hope, Salvation)."
                }
              },
              required: ["reference", "text", "theme"]
            }
          }
        }
      })
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from the Gemini API");
    }

    const results = JSON.parse(text);

    // Save to DB Cache asynchronously
    db.run(
      'INSERT OR REPLACE INTO bible_search_cache (query, translation, results_json) VALUES (?, ?, ?)',
      queryStr,
      transStr,
      JSON.stringify(results)
    ).catch(err => console.error('Failed to cache bible search results in DB:', err));

    res.json({ success: true, results });
  } catch (error: any) {
    console.error("Bible search error:", error);
    // Graceful fallback to avoid applet error screen
    const fallbackResults = [
      {
        reference: "Devotional Notice",
        text: `We are currently experiencing connection limits or rate-limiting with our Bible search service (${error.message || 'Timeout'}). Please try again in a few seconds.`,
        theme: "System"
      },
      {
        reference: "Tip",
        text: "You can read 'Genesis 1' which is preloaded and fully working offline, or explore the preloaded Hymnal and Sermons!",
        theme: "Offline"
      }
    ];
    res.json({ success: true, results: fallbackResults, isFallback: true });
  }
});


// Serve static frontend files (Vite middleware setup)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
