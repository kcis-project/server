/**
 * 경북대 학과 정보 수집 → departments 테이블 seed
 *
 * 경북대 홈페이지에서 학과 목록을 가져와 DB에 저장한다.
 * 최초 1회 실행 후, 이후에는 수동으로 필요 시 재실행.
 *
 * 사용법: npm run seed:departments
 */
require('dotenv').config();
const https = require('https');
const db = require('../src/config/db');

// 경북대 학과 목록 (수동 정리 — 홈페이지 크롤링 결과 기반)
// TODO: 경북대 홈페이지 크롤링 자동화 시 이 배열을 동적으로 채울 것
const DEPARTMENTS = [
  { college: '인문대학', departments: ['국어국문학과', '영어영문학과', '사학과', '철학과', '불어불문학과', '독어독문학과', '중어중문학과', '일어일문학과', '고고인류학과', '한문학과'] },
  { college: '사회과학대학', departments: ['정치외교학과', '사회학과', '지리학과', '문헌정보학과', '심리학과', '사회복지학과', '미디어커뮤니케이션학과'] },
  { college: '자연과학대학', departments: ['수학과', '물리학과', '화학과', '생명과학과', '지질학과', '통계학과', '천문대기과학과'] },
  { college: '경상대학', departments: ['경제통상학부', '경영학부', '회계세무학과'] },
  { college: '공과대학', departments: ['토목공학과', '기계공학과', '화학공학과', '금속신소재공학과', '건축학부', '전자공학부', '전기공학과', '컴퓨터학부', '환경공학과', '응용화학공학과', '건설환경에너지공학부'] },
  { college: 'IT대학', departments: ['전자공학부', '컴퓨터학부', '글로벌소프트웨어융합전공'] },
  { college: '농업생명과학대학', departments: ['식물생명과학부', '응용생물학과', '생물섬유소재학과', '식품공학부', '원예과학과', '환경생태학과', '조경학과', '산림과학·조경학부'] },
  { college: '예술대학', departments: ['미술학과', '음악학과'] },
  { college: '사범대학', departments: ['교육학과', '국어교육과', '영어교육과', '역사교육과', '지리교육과', '일반사회교육과', '윤리교육과', '수학교육과', '물리교육과', '화학교육과', '생물교육과', '지구과학교육과', '가정교육과', '체육교육과'] },
  { college: '의과대학', departments: ['의학과', '의예과'] },
  { college: '치과대학', departments: ['치의학과', '치의예과'] },
  { college: '간호대학', departments: ['간호학과'] },
  { college: '약학대학', departments: ['약학과', '제약학과'] },
  { college: '생활과학대학', departments: ['아동학부', '의류학과', '식품영양학과'] },
  { college: '과학기술대학', departments: ['전자공학과', '소프트웨어학과', '신소재공학과', '정밀기계공학과', '건설방재공학과', '자동차공학과', '나노소재공학과'] },
  { college: '행정학부', departments: ['행정학부'] },
  { college: '자율전공부', departments: ['자율전공부'] },
];

async function main() {
  await db.init();
  const pool = db.getPool();
  const conn = await pool.getConnection();

  // 기존 데이터 삭제 후 재삽입
  await conn.execute('DELETE FROM departments');

  let count = 0;
  for (const { college, departments } of DEPARTMENTS) {
    for (const name of departments) {
      await conn.execute(
        'INSERT INTO departments (id, name, college) VALUES (SYS_GUID(), :name, :college)',
        { name, college }
      );
      count++;
    }
  }

  await conn.close();
  await db.close();
  console.log(`완료: ${count}개 학과 insert`);
}

main();
