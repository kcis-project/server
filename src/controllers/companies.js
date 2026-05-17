const { getPool } = require('../config/db');

exports.search = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return res.json([]);

  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM companies WHERE LOWER(name) LIKE :q ORDER BY name FETCH FIRST 10 ROWS ONLY`,
      { q: `%${q.toLowerCase()}%` }
    );
    res.json(result.rows);
  } finally {
    await conn.close();
  }
};

exports.getById = async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      'SELECT * FROM companies WHERE id = :id',
      { id: req.params.id }
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } finally {
    await conn.close();
  }
};

exports.create = async (req, res) => {
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
};

exports.update = async (req, res) => {
  const { name, industry, ceo, established } = req.body;

  const conn = await getPool().getConnection();
  try {
    const result = await conn.execute(
      `UPDATE companies SET name=:name, industry=:industry, ceo=:ceo, established=:established WHERE id = :id`,
      { id: req.params.id, name, industry: industry || null, ceo: ceo || null, established: established || null }
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
      'DELETE FROM companies WHERE id = :id',
      { id: req.params.id }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } finally {
    await conn.close();
  }
};

exports.fetchExternal = async (req, res) => {
  // TODO: 공공 API(DART 등) 연동 후 구현
  const { q } = req.query;
  res.json({ message: '외부 API 연동 예정', query: q });
};
