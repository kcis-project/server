const { getPool } = require('../config/db');
const { serializeRows } = require('../util/row');

exports.list = async (req, res, next) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM departments';
    const binds = {};

    if (q) {
      sql += ' WHERE LOWER(name) LIKE :q';
      binds.q = `%${q.toLowerCase()}%`;
    }
    sql += ' ORDER BY college, name';

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
