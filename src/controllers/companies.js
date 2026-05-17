const { getPool } = require('../config/db');
const { serializeRow, serializeRows, hexToBuffer } = require('../util/row');

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const term = q.toLowerCase();
    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(
        `SELECT * FROM companies
         WHERE LOWER(name) LIKE :prefix OR LOWER(name) LIKE :sub
         ORDER BY
           CASE WHEN LOWER(name) LIKE :prefix THEN 0 ELSE 1 END,
           name
         FETCH FIRST 10 ROWS ONLY`,
        { prefix: `${term}%`, sub: `%${term}%` }
      );
      res.json(serializeRows(result.rows));
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute('SELECT * FROM companies ORDER BY name');
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
        'SELECT * FROM companies WHERE id = :id',
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

exports.create = async (req, res, next) => {
  try {
    const { name, industry, ceo, established } = req.body;
    if (!name) return res.status(400).json({ error: '기업명은 필수입니다' });

    const conn = await getPool().getConnection();
    try {
      await conn.execute(
        `INSERT INTO companies (id, name, industry, ceo, established)
         VALUES (SYS_GUID(), :name, :industry, :ceo, :established)`,
        {
          name,
          industry: industry || null,
          ceo: ceo || null,
          established: established || null,
        }
      );
      res.status(201).json({ ok: true });
    } finally {
      await conn.close();
    }
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, industry, ceo, established } = req.body;
    const conn = await getPool().getConnection();
    try {
      const result = await conn.execute(
        `UPDATE companies SET name=:name, industry=:industry, ceo=:ceo, established=:established WHERE id = :id`,
        {
          id: hexToBuffer(req.params.id),
          name,
          industry: industry || null,
          ceo: ceo || null,
          established: established || null,
        }
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
        'DELETE FROM companies WHERE id = :id',
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

exports.fetchExternal = async (req, res) => {
  const { q } = req.query;
  res.json({ message: '외부 API 연동 예정', query: q || '' });
};
