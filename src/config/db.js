const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let pool;

async function init() {
  if (process.env.TNS_ADMIN) {
    oracledb.initOracleClient({ configDir: process.env.TNS_ADMIN });
  }

  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolMin: 1,
    poolMax: 4,
  });

  console.log('Oracle DB pool created');
}

function getPool() {
  return pool;
}

async function close() {
  if (pool) await pool.close(0);
}

module.exports = { init, getPool, close };
