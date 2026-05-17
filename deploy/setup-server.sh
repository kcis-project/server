#!/usr/bin/env bash
# KCIS 서버 최초 셋업 스크립트
# 사용법: 서버에 SSH 접속 후 한 번만 실행
#   bash /opt/kcis/server/deploy/setup-server.sh

set -euo pipefail

APP_DIR=/opt/kcis
SERVER_DIR=$APP_DIR/server
WALLET_DIR=$APP_DIR/wallet
LOG_DIR=$APP_DIR/logs

echo "[1/7] 디렉토리 준비"
sudo mkdir -p "$APP_DIR" "$WALLET_DIR" "$LOG_DIR"
sudo chown -R ubuntu:ubuntu "$APP_DIR"

echo "[2/7] Oracle Instant Client (Basic Lite) 확인"
if [ ! -d /opt/oracle/instantclient_23_5 ]; then
  sudo mkdir -p /opt/oracle
  cd /tmp
  ARCH=$(uname -m)
  if [ "$ARCH" = "aarch64" ]; then
    URL="https://download.oracle.com/otn_software/linux/instantclient/2350000/instantclient-basiclite-linux.arm64-23.5.0.24.07.zip"
  else
    URL="https://download.oracle.com/otn_software/linux/instantclient/2350000/instantclient-basiclite-linux.x64-23.5.0.24.07.zip"
  fi
  echo "  → 다운로드: $URL"
  curl -fsSLO "$URL"
  ZIP=$(ls instantclient-basiclite-linux.*.zip | head -n1)
  sudo unzip -q -o "$ZIP" -d /opt/oracle
  rm "$ZIP"
  echo "/opt/oracle/instantclient_23_5" | sudo tee /etc/ld.so.conf.d/oracle-instantclient.conf >/dev/null
  sudo ldconfig
fi

echo "[3/7] Wallet zip 확인 ($WALLET_DIR)"
if ls "$APP_DIR"/Wallet_*.zip >/dev/null 2>&1; then
  WALLET_ZIP=$(ls "$APP_DIR"/Wallet_*.zip | head -n1)
  unzip -o "$WALLET_ZIP" -d "$WALLET_DIR" >/dev/null
  chmod 600 "$WALLET_DIR"/*
  # Oracle 배포 wallet 의 sqlnet.ora 는 ?/network/admin 으로 $ORACLE_HOME 을 가리킴.
  # oracledb thick client 에선 이걸 못 풀어 ORA-12154/wallet not found 가 난다. 절대경로로 교체.
  cat > "$WALLET_DIR/sqlnet.ora" <<SQLNET
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="$WALLET_DIR")))
SSL_SERVER_DN_MATCH=yes
SQLNET
  echo "  → Wallet 풀기 + sqlnet.ora 경로 보정 완료"
else
  echo "  ! $APP_DIR/Wallet_*.zip 이 없습니다."
  echo "    먼저 OCI 콘솔에서 Wallet 받아 scp 로 올려주세요."
fi

echo "[4/7] Node 의존성 설치"
cd "$SERVER_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ! $SERVER_DIR/.env 를 편집해 DB_PASSWORD 등을 채워주세요."
fi
npm ci --omit=dev

echo "[5/7] Nginx 사이트 설정"
sudo cp "$SERVER_DIR/deploy/nginx-kcis.conf" /etc/nginx/sites-available/kcis
sudo ln -sf /etc/nginx/sites-available/kcis /etc/nginx/sites-enabled/kcis
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "[6/7] PM2 기동"
pm2 startOrReload "$SERVER_DIR/ecosystem.config.js"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu >/dev/null || true

echo "[7/7] 헬스체크 (DB pool 초기화 대기)"
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3000/health >/dev/null 2>&1; then
    echo "  → 127.0.0.1:3000 OK"
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:3000/health && echo
curl -fsS http://127.0.0.1/health && echo

echo
echo "완료. 외부 확인: curl http://\$(curl -s ifconfig.me)/health"
