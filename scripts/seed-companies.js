/**
 * 주요 기업 정보 초기 시드 (멱등)
 *
 * 같은 이름이 이미 있으면 UPDATE, 없으면 INSERT (MERGE).
 * 추후 DART API 연동 시 이 스크립트를 확장하여 자동 수집.
 *
 * 사용법: npm run seed:companies
 */
require('dotenv').config();
const db = require('../src/config/db');

const COMPANIES = [
  { name: '토스', industry: '핀테크', ceo: '이승건', established: '2013' },
  { name: '카카오', industry: '인터넷 서비스', ceo: '정신아', established: '2014' },
  { name: '네이버', industry: '인터넷 서비스', ceo: '최수연', established: '1999' },
  { name: '삼성전자', industry: '전자/반도체', ceo: '한종희', established: '1969' },
  { name: 'LG전자', industry: '전자', ceo: '조주완', established: '1958' },
  { name: 'SK하이닉스', industry: '반도체', ceo: '곽노정', established: '1983' },
  { name: '쿠팡', industry: '이커머스', ceo: '김범석', established: '2010' },
  { name: '배달의민족', industry: '음식 배달', ceo: '김범준', established: '2010' },
  { name: '당근', industry: '지역 커뮤니티', ceo: '김재현', established: '2015' },
  { name: 'NHN', industry: 'IT 서비스', ceo: '정우진', established: '2013' },
  { name: '라인플러스', industry: '메신저', ceo: '이은정', established: '2013' },
  { name: '현대자동차', industry: '자동차', ceo: '장재훈', established: '1967' },
  { name: '기아', industry: '자동차', ceo: '송호성', established: '1944' },
  { name: '포스코', industry: '철강', ceo: '장인화', established: '1968' },
  { name: 'KT', industry: '통신', ceo: '김영섭', established: '1981' },
  { name: 'SK텔레콤', industry: '통신', ceo: '유영상', established: '1984' },
  { name: 'LG CNS', industry: 'IT 서비스', ceo: '현신균', established: '1987' },
  { name: '삼성SDS', industry: 'IT 서비스', ceo: '이준희', established: '1985' },
  { name: '카카오뱅크', industry: '인터넷 은행', ceo: '윤호영', established: '2016' },
  { name: '카카오페이', industry: '핀테크', ceo: '신원근', established: '2017' },
  { name: '야놀자', industry: '여행/숙박', ceo: '이수진', established: '2005' },
  { name: '직방', industry: '부동산', ceo: '안성우', established: '2010' },
  { name: '리디', industry: '콘텐츠', ceo: '배기식', established: '2009' },
  { name: '두나무', industry: '핀테크/블록체인', ceo: '이석우', established: '2012' },
  { name: '크래프톤', industry: '게임', ceo: '김창한', established: '2007' },
  { name: '넥슨', industry: '게임', ceo: '강대현', established: '1994' },
  { name: '엔씨소프트', industry: '게임', ceo: '김택진', established: '1997' },
  { name: '우아한형제들', industry: '음식 배달', ceo: '김범준', established: '2011' },
  { name: '무신사', industry: '패션 이커머스', ceo: '조만호', established: '2001' },
  { name: '하이브', industry: '엔터테인먼트', ceo: '이재상', established: '2005' },
  { name: '쏘카', industry: '모빌리티', ceo: '박재욱', established: '2011' },
  { name: '네이버클라우드', industry: '클라우드', ceo: '김유원', established: '2009' },
  { name: '라인넥스트', industry: '블록체인', ceo: '고영수', established: '2022' },
  { name: '비바리퍼블리카', industry: '핀테크', ceo: '이승건', established: '2013' },
  { name: '뱅크샐러드', industry: '핀테크', ceo: '김태훈', established: '2012' },
  { name: '오늘의집', industry: '커머스', ceo: '이승재', established: '2014' },
  { name: '마켓컬리', industry: '이커머스', ceo: '김슬아', established: '2014' },
  { name: '컬리', industry: '이커머스', ceo: '김슬아', established: '2014' },
  { name: '당근마켓', industry: '지역 커뮤니티', ceo: '김재현', established: '2015' },
  { name: '왓챠', industry: '콘텐츠', ceo: '박태훈', established: '2011' },
];

async function main() {
  await db.init();
  const pool = db.getPool();
  const conn = await pool.getConnection();

  let inserted = 0;
  let updated = 0;
  for (const c of COMPANIES) {
    try {
      const result = await conn.execute(
        `MERGE INTO companies t
           USING (SELECT :name AS name, :industry AS industry, :ceo AS ceo, :established AS established FROM dual) s
           ON (LOWER(t.name) = LOWER(s.name))
         WHEN MATCHED THEN UPDATE SET t.industry = s.industry, t.ceo = s.ceo, t.established = s.established, t.fetched_at = CURRENT_TIMESTAMP
         WHEN NOT MATCHED THEN INSERT (id, name, industry, ceo, established)
           VALUES (SYS_GUID(), s.name, s.industry, s.ceo, s.established)`,
        { name: c.name, industry: c.industry, ceo: c.ceo, established: c.established }
      );
      if (result.rowsAffected === 1) inserted++;
      else updated++;
    } catch (err) {
      console.error(`실패 (${c.name}):`, err.message);
    }
  }

  await conn.close();
  await db.close();
  console.log(`완료: ${COMPANIES.length}건 처리 (변경 rowsAffected 기준 합산 ${inserted + updated})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
