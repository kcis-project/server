const { getPool } = require('../config/db');

exports.list = async (req, res) => {
  const { q, job_type, dept, year, is_current } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const binds = {};

  if (q) {
    sql += ' AND (LOWER(name) LIKE :q OR LOWER(current_company) LIKE :q)';
    binds.q = `%${q.toLowerCase()}%`;
  }
  if (job_type) {
    sql += ' AND job_type = :job_type';
    binds.job_type = job_type;
  }
  if (dept) {
    sql += ' AND dept = :dept';
    binds.dept = dept;
  }
  if (year) {
    sql += ' AND year = :year';
    binds.year = year;
  }
  if (is_current !== undefined) {
    sql += ' AND is_current = :is_current';
    binds.is_current = is_current === 'true' ? 1 : 0;
  }

  sql += ' ORDER BY created_at ASC';

  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(sql, binds);
    res.json(result.rows);
  } finally {
    await conn.close();
  }
};

exports.getById = async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      'SELECT * FROM members WHERE id = :id',
      { id: req.params.id }
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } finally {
    await conn.close();
  }
};

exports.create = async (req, res) => {
  const { name, dept, year, job_type, current_company, is_current, experiences, education, awards, certs, etc, linkedin } = req.body;
  if (!name) return res.status(400).json({ error: '이름은 필수입니다' });

  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO members (id, name, dept, year, job_type, current_company, is_current, experiences, education, awards, certs, etc, linkedin)
       VALUES (SYS_GUID(), :name, :dept, :year, :job_type, :current_company, :is_current, :experiences, :education, :awards, :certs, :etc, :linkedin)`,
      {
        name,
        dept: dept || null,
        year: year || null,
        job_type: job_type || null,
        current_company: current_company || null,
        is_current: is_current ? 1 : 0,
        experiences: JSON.stringify(experiences || []),
        education: JSON.stringify(education || []),
        awards: JSON.stringify(awards || []),
        certs: JSON.stringify(certs || []),
        etc: JSON.stringify(etc || []),
        linkedin: linkedin || null,
      }
    );
    res.status(201).json({ ok: true, rowsAffected: result.rowsAffected });
  } finally {
    await conn.close();
  }
};

exports.update = async (req, res) => {
  const { name, dept, year, job_type, current_company, is_current, experiences, education, awards, certs, etc, linkedin } = req.body;

  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      `UPDATE members SET name=:name, dept=:dept, year=:year, job_type=:job_type, current_company=:current_company,
       is_current=:is_current, experiences=:experiences, education=:education, awards=:awards, certs=:certs, etc=:etc, linkedin=:linkedin
       WHERE id = :id`,
      {
        id: req.params.id,
        name,
        dept: dept || null,
        year: year || null,
        job_type: job_type || null,
        current_company: current_company || null,
        is_current: is_current ? 1 : 0,
        experiences: JSON.stringify(experiences || []),
        education: JSON.stringify(education || []),
        awards: JSON.stringify(awards || []),
        certs: JSON.stringify(certs || []),
        etc: JSON.stringify(etc || []),
        linkedin: linkedin || null,
      }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } finally {
    await conn.close();
  }
};

exports.remove = async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      'DELETE FROM members WHERE id = :id',
      { id: req.params.id }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } finally {
    await conn.close();
  }
};
