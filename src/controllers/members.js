const oracledb = require('oracledb');
const { getPool } = require('../config/db');
const { serializeRow, serializeRows, hexToBuffer } = require('../util/row');

exports.list = async (req, res, next) => {
  try {
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
      binds.is_current = is_current === 'true' || is_current === '1' ? 1 : 0;
    }

    sql += ' ORDER BY created_at DESC';

    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(sql, binds);
      res.json(serializeRows(result.rows));
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(
        'SELECT * FROM members WHERE id = :id',
        { id: hexToBuffer(req.params.id) }
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(serializeRow(result.rows[0]));
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};

function bindFromBody(body) {
  const {
    name, dept, year, job_type, current_company, is_current,
    experiences, education, awards, certs, etc, linkedin,
  } = body;
  return {
    name,
    dept: dept || null,
    year: year ? String(year) : null,
    job_type: job_type || null,
    current_company: current_company || null,
    is_current: is_current ? 1 : 0,
    experiences: JSON.stringify(experiences || []),
    education: JSON.stringify(education || []),
    awards: JSON.stringify(awards || []),
    certs: JSON.stringify(certs || []),
    etc: JSON.stringify(etc || []),
    linkedin: linkedin || null,
  };
}

exports.create = async (req, res, next) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: '이름은 필수입니다' });
    const binds = bindFromBody(req.body);

    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(
        `INSERT INTO members (id, name, dept, year, job_type, current_company, is_current, experiences, education, awards, certs, etc, linkedin)
         VALUES (SYS_GUID(), :name, :dept, :year, :job_type, :current_company, :is_current, :experiences, :education, :awards, :certs, :etc, :linkedin)
         RETURNING id INTO :out_id`,
        { ...binds, out_id: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } }
      );
      const idBuf = result.outBinds.out_id[0];
      res.status(201).json({ ok: true, id: Buffer.from(idBuf).toString('hex').toUpperCase() });
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const binds = bindFromBody(req.body);
    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(
        `UPDATE members SET name=:name, dept=:dept, year=:year, job_type=:job_type, current_company=:current_company,
         is_current=:is_current, experiences=:experiences, education=:education, awards=:awards, certs=:certs, etc=:etc, linkedin=:linkedin
         WHERE id = :id`,
        { ...binds, id: hexToBuffer(req.params.id) }
      );
      if (!result.rowsAffected) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(
        'DELETE FROM members WHERE id = :id',
        { id: hexToBuffer(req.params.id) }
      );
      if (!result.rowsAffected) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};
