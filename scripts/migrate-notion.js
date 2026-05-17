/**
 * 노션 DB export(CSV) → Oracle ATP members 테이블 마이그레이션
 *
 * 사용법:
 *   1) 노션에서 DB를 CSV로 export
 *   2) scripts/data/members.csv 로 옮긴다 (또는 --file 로 다른 경로 지정)
 *   3) npm run migrate:notion -- --dry        # 미리보기
 *      npm run migrate:notion                  # 실제 insert (이미 같은 이름이면 update)
 *
 * 헤더 매칭 (대소문자/공백 무시):
 *   이름 / name
 *   학과 / dept / department
 *   부전공 / double_major
 *   연도 / year
 *   직종 / job_type / job
 *   현재소속 / current / current_company / company
 *   현직 / is_current / current?
 *   경력 / experiences        (줄바꿈 또는 '|' 구분)
 *   학력 / education
 *   활동 / activities / etc
 *   수상 / awards
 *   자격증 / certs / certifications
 *   linkedin
 *
 * 본 스크립트는 idempotent: name 기준 MERGE (있으면 UPDATE, 없으면 INSERT).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const fileArg = argv.find(a => a.startsWith('--file='));
const CSV_PATH = fileArg
  ? path.resolve(fileArg.slice('--file='.length))
  : path.join(__dirname, 'data', 'members.csv');

// ── CSV 파서 (따옴표 + 멀티라인 + escape 지원) ────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else cur += ch;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r[0] && r[0].trim()));
}

// ── 헤더 → 필드 매핑 ────────────────────────────────────────────
const HEADER_MAP = {
  name:            ['이름', 'name', '성명'],
  dept:            ['학과', 'dept', 'department', '전공'],
  double_major:    ['부전공', 'double_major', '복수전공'],
  year:            ['연도', 'year', '학번', '입학연도', '졸업연도'],
  job_type:        ['직종', 'job_type', 'job', '직군'],
  current_company: ['현재소속', '현재', 'current', 'current_company', 'company', '소속'],
  is_current:      ['현직', '재직', 'is_current'],
  experiences:     ['경력', 'experiences', 'experience'],
  education:       ['학력', 'education'],
  awards:          ['수상', 'awards', 'award'],
  certs:           ['자격증', 'certs', 'certifications', '자격'],
  etc:             ['활동', 'etc', 'activities', '동아리', '기타'],
  linkedin:        ['linkedin', 'linkedin_url', '링크드인'],
};

function normalize(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ''); }

function buildHeaderIndex(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    const norm = normalize(h);
    for (const [field, aliases] of Object.entries(HEADER_MAP)) {
      if (aliases.some(a => normalize(a) === norm)) {
        idx[field] = i;
        return;
      }
    }
  });
  return idx;
}

// ── 멀티라인 / pipe 구분 셀 분리 ─────────────────────────────────
function splitItems(text) {
  if (!text) return [];
  return String(text).split(/\r?\n|[|]/).map(s => s.trim()).filter(s => s.length > 1);
}

function parseExperience(line) {
  // 예시: "삼성전자 · 시니어 엔지니어 · 2020.03 ~ 현재"
  //       "토스 / 백엔드 / 2021-2024"
  //       "회사명 (직책) 2020-2022"
  const parts = line.split(/\s*[·\/]\s*/);
  if (parts.length >= 2) {
    const period = parts.find(p => /\d{4}/.test(p)) || '';
    const nonPeriod = parts.filter(p => p !== period);
    return { company: nonPeriod[0] || '', role: nonPeriod[1] || '', period };
  }
  const m = line.match(/^(.+?)\s*\((.+?)\)\s*(.*)$/);
  if (m) return { company: m[1].trim(), role: m[2].trim(), period: m[3].trim() };
  return { company: line, role: '', period: '' };
}

function parseEducation(line) {
  const parts = line.split(/\s*[·\/]\s*/);
  const period = parts.find(p => /\d{4}/.test(p)) || '';
  const nonPeriod = parts.filter(p => p !== period);
  return { school: nonPeriod[0] || line, major: nonPeriod[1] || '', period };
}

function parseCert(line) {
  const parts = line.split(/\s*[·\/]\s*/);
  return { name: parts[0] || line, issuer: parts[1] || '', date: parts[2] || '' };
}

function rowToMember(headerIdx, cols) {
  const get = (k) => headerIdx[k] != null ? (cols[headerIdx[k]] || '').trim() : '';
  const name = get('name');
  if (!name) return null;

  const dept = [get('dept'), get('double_major')].filter(Boolean).join(' / ');
  const year = get('year') || (dept.match(/\((\d{2,4})\)/)?.[1] ?? '');
  const isCur = /^(y|yes|true|1|현직|재직중?|o)$/i.test(get('is_current'));

  const experiences = splitItems(get('experiences')).map(parseExperience);
  const education   = splitItems(get('education')).map(parseEducation);
  const awards      = splitItems(get('awards')).map(line => ({ name: line }));
  const certs       = splitItems(get('certs')).map(parseCert);
  const etc         = splitItems(get('etc')).map(line => ({ name: line }));

  return {
    name,
    dept,
    year: year || null,
    job_type: get('job_type') || null,
    current_company: get('current_company') || experiences[0]?.company || null,
    is_current: isCur,
    experiences, education, awards, certs, etc,
    linkedin: get('linkedin') || null,
  };
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV 파일이 없습니다: ${CSV_PATH}`);
    console.error('scripts/data/members.csv 에 노션 export를 넣거나, --file=경로 로 지정하세요.');
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error('CSV 가 비어있거나 헤더만 있습니다.');
    process.exit(1);
  }

  const headerIdx = buildHeaderIndex(rows[0]);
  console.log('헤더 매핑:', headerIdx);
  const missingRequired = !('name' in headerIdx);
  if (missingRequired) {
    console.error('필수 헤더 (이름/name) 를 찾을 수 없습니다. 첫 행:', rows[0]);
    process.exit(1);
  }

  const members = rows.slice(1).map(cols => rowToMember(headerIdx, cols)).filter(Boolean);
  console.log(`${members.length}명 파싱 완료.`);

  if (DRY) {
    console.log('--dry 모드. 첫 3건 미리보기:');
    members.slice(0, 3).forEach(m => console.log(JSON.stringify(m, null, 2)));
    return;
  }

  await db.init();
  const pool = db.getPool();
  const conn = await pool.getConnection();

  let upserted = 0, failed = 0;
  for (const m of members) {
    try {
      await conn.execute(
        `MERGE INTO members t
           USING (SELECT :name AS name FROM dual) s
           ON (LOWER(t.name) = LOWER(s.name))
         WHEN MATCHED THEN UPDATE SET
           dept = :dept, year = :year, job_type = :job_type,
           current_company = :current_company, is_current = :is_current,
           experiences = :experiences, education = :education, awards = :awards,
           certs = :certs, etc = :etc, linkedin = :linkedin
         WHEN NOT MATCHED THEN INSERT (id, name, dept, year, job_type, current_company, is_current, experiences, education, awards, certs, etc, linkedin)
           VALUES (SYS_GUID(), :name, :dept, :year, :job_type, :current_company, :is_current, :experiences, :education, :awards, :certs, :etc, :linkedin)`,
        {
          name: m.name,
          dept: m.dept || null,
          year: m.year || null,
          job_type: m.job_type || null,
          current_company: m.current_company || null,
          is_current: m.is_current ? 1 : 0,
          experiences: JSON.stringify(m.experiences || []),
          education:   JSON.stringify(m.education   || []),
          awards:      JSON.stringify(m.awards      || []),
          certs:       JSON.stringify(m.certs       || []),
          etc:         JSON.stringify(m.etc         || []),
          linkedin: m.linkedin || null,
        }
      );
      upserted++;
    } catch (err) {
      failed++;
      console.error(`실패 (${m.name}):`, err.message);
    }
  }

  await conn.close();
  await db.close();
  console.log(`완료: ${upserted}건 upsert, ${failed}건 실패`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
