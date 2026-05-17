-- Oracle ATP에서 실행할 테이블 생성 DDL
-- OCI 콘솔 → Autonomous Database → Database Actions → SQL 에서 실행

CREATE TABLE members (
  id               RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
  name             VARCHAR2(100) NOT NULL,
  dept             VARCHAR2(200),
  year             VARCHAR2(10),
  job_type         VARCHAR2(100),
  current_company  VARCHAR2(200),
  is_current       NUMBER(1) DEFAULT 0,
  experiences      CLOB DEFAULT '[]' CHECK (experiences IS JSON),
  education        CLOB DEFAULT '[]' CHECK (education IS JSON),
  awards           CLOB DEFAULT '[]' CHECK (awards IS JSON),
  certs            CLOB DEFAULT '[]' CHECK (certs IS JSON),
  etc              CLOB DEFAULT '[]' CHECK (etc IS JSON),
  linkedin         VARCHAR2(500),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
  id               RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
  name             VARCHAR2(200) NOT NULL,
  industry         VARCHAR2(200),
  ceo              VARCHAR2(100),
  established      VARCHAR2(20),
  fetched_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  id               RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
  name             VARCHAR2(200) NOT NULL,
  college          VARCHAR2(200)
);

CREATE INDEX idx_members_name ON members(LOWER(name));
CREATE INDEX idx_members_job_type ON members(job_type);
CREATE INDEX idx_members_dept ON members(dept);
CREATE INDEX idx_companies_name ON companies(LOWER(name));
CREATE INDEX idx_departments_name ON departments(LOWER(name));
