const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;
oracledb.fetchAsString = [oracledb.CLOB];

let pool;
let clientInitialized = false;

async function init() {
  if (!clientInitialized && process.env.TNS_ADMIN) {
    try {
      oracledb.initOracleClient({ configDir: process.env.TNS_ADMIN });
      clientInitialized = true;
    } catch (err) {
      if (!String(err.message).includes('already been initialized')) throw err;
      clientInitialized = true;
    }
  }

  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolMin: 1,
    poolMax: 4,
    poolIncrement: 1,
  });

  console.log('Oracle DB pool created');
}

function getPool() {
  if (!pool) throw new Error('DB pool not initialized');
  return pool;
}

async function close() {
  if (pool) {
    await pool.close(0);
    pool = null;
  }
}

module.exports = { init, getPool, close };
