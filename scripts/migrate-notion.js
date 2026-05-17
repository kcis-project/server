/**
 * 노션 DB export(CSV) → Oracle ATP members 테이블 마이그레이션
 *
 * 사용법:
 *   1. 노션에서 DB를 CSV로 export
 *   2. export된 파일을 scripts/data/members.csv 에 배치
 *   3. npm run migrate:notion
 *
 * CSV 컬럼 형식 (build_site_structured.py 기준):
 *   이름, 학과, 부전공, 직종, 경력1, 기간1, ..., 경력8, 기간8, 활동, 자격증, 현직여부
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const db = require('../src/config/db');

const CSV_PATH = path.join(__dirname, 'data', 'members.csv');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseYear(dept) {
  const m = dept.match(/\((\d{2,4})\)/);
  return m ? m[1] : null;
}

function parseRow(cols) {
  const name = cols[0];
  if (!name || name.length < 2 || name === '이름') return null;

  const dept = cols[1] || '';
  const doubleMajor = cols[2] || '';
  const jobType = cols[3] || '';
  const year = parseYear(dept);

  const experiences = [];
  for (let i = 0; i < 8; i++) {
    const text = cols[4 + i * 2] || '';
    const period = cols[5 + i * 2] || '';
    if (!text) continue;
    experiences.push({ text: text + (period ? ` · ${period}` : ''), company: text.split('|')[0].trim() });
  }

  const activities = (cols[20] || '').split('|').map(s => s.trim()).filter(s => s.length > 2);
  const certs = (cols[21] || '').split(/[|,]/).map(s => s.trim()).filter(s => s.length > 1);
  const isCurrent = (cols[22] || '').toUpperCase() === 'Y';

  return {
    name,
    dept: dept + (doubleMajor ? ` / ${doubleMajor}` : ''),
    year,
    job_type: jobType,
    current_company: experiences[0]?.company || null,
    is_current: isCurrent,
    experiences,
    education: [],
    awards: activities.slice(0, 8),
    certs,
    etc: activities.slice(8),
    linkedin: null,
  };
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV 파일이 없습니다: ${CSV_PATH}`);
    console.error('scripts/data/ 폴더에 members.csv를 넣어주세요.');
    process.exit(1);
  }

  await db.init();
  const pool = db.getPool();
  const conn = await pool.getConnection();

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const rows = lines.slice(1).map(parseCsvLine).map(parseRow).filter(Boolean);

  console.log(`${rows.length}명 파싱 완료. DB에 insert 시작...`);

  let inserted = 0;
  for (const row of rows) {
    try {
      await conn.execute(
        `INSERT INTO members (id, name, dept, year, job_type, current_company, is_current, experiences, education, awards, certs, etc, linkedin)
         VALUES (SYS_GUID(), :name, :dept, :year, :job_type, :current_company, :is_current, :experiences, :education, :awards, :certs, :etc, :linkedin)`,
        {
          name: row.name,
          dept: row.dept,
          year: row.year,
          job_type: row.job_type,
          current_company: row.current_company,
          is_current: row.is_current ? 1 : 0,
          experiences: JSON.stringify(row.experiences),
          education: JSON.stringify(row.education),
          awards: JSON.stringify(row.awards),
          certs: JSON.stringify(row.certs),
          etc: JSON.stringify(row.etc),
          linkedin: row.linkedin,
        }
      );
      inserted++;
    } catch (err) {
      console.error(`실패 (${row.name}):`, err.message);
    }
  }

  await conn.close();
  await db.close();
  console.log(`완료: ${inserted}/${rows.length}명 insert`);
}

main();
