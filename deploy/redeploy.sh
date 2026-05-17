#!/usr/bin/env bash
# 코드 변경 후 재배포
# 사용법: bash /opt/kcis/server/deploy/redeploy.sh

set -euo pipefail
cd /opt/kcis/server
git pull --ff-only
npm ci --omit=dev
pm2 reload kcis-api
pm2 status kcis-api
