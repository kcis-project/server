# KCIS Server

KCIS 연명부 API 서버. Express.js + Oracle ATP. CI/CD: GitHub Actions → SSH deploy (`.github/workflows/deploy.yml`).

## 실행

```bash
cp .env.example .env
# .env에 DB 접속 정보 채우기

npm install
npm run dev      # 개발 (nodemon)
npm start        # 프로덕션
```

## 스크립트

```bash
npm run seed:departments   # 경북대 학과 정보 시드
npm run seed:companies     # 주요 기업 정보 시드
npm run migrate:notion     # 노션 CSV → DB 마이그레이션
```

DB 테이블 생성은 `scripts/init-tables.sql`을 OCI Database Actions에서 직접 실행.

## 프로젝트 구조

```
server/
├── src/
│   ├── index.js              # 앱 진입점
│   ├── config/db.js          # Oracle 커넥션 풀
│   ├── routes/               # 라우터 (members, companies, departments, admin)
│   └── controllers/          # 비즈니스 로직
├── scripts/
│   ├── init-tables.sql       # DDL
│   ├── seed-departments.js   # 학과 시드
│   ├── seed-companies.js     # 기업 시드
│   ├── migrate-notion.js     # 노션 마이그레이션
│   └── data/                 # CSV 등 원본 데이터
├── .env.example
└── package.json
```

## 배포

서버: `168.110.112.119` (OCI E2.1.Micro, Ubuntu 22.04)

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@168.110.112.119
cd /opt/kcis
git pull
pm2 restart kcis-api
```
