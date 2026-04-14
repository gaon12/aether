# Aether

Threads 기반 번역/요약 봇과 운영 대시보드를 하나의 Next.js 코드베이스로 운영하는 프로젝트입니다.

## Requirements

- Node.js 24
- SQLite3
- Threads 앱 자격 증명
- OpenAI 호환 로컬 모델 서버

## Environment

`.env.example`을 기준으로 환경변수를 준비합니다.

주요 항목:

- `SQLITE_DB_PATH`
- `THREADS_APP_ID`
- `THREADS_APP_SECRET`
- `THREADS_WEBHOOK_SECRET`
- `THREADS_WEBHOOK_VERIFY_TOKEN`
- `THREADS_BOT_HANDLE`
- `TOKEN_ENCRYPTION_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL_NAME`

대시보드 계정과 일반 운영 설정은 첫 실행 후 웹의 `/setup`, `/login`, `/settings` 화면에서 관리합니다.
민감한 비밀값은 계속 `.env` 에서 관리합니다.

## Run

```bash
npm install
npm run migrate
npm run dev
```

워커는 별도 프로세스로 실행합니다.

```bash
npm run worker
```

시간대별 메트릭을 재계산하려면:

```bash
npm run backfill
```

## Scripts

- `npm run dev`: Next.js 개발 서버
- `npm run migrate`: SQLite 스키마 생성/업데이트
- `npm run worker`: 큐 기반 워커 실행
- `npm run backfill`: `metrics_hourly` 재계산
- `npm run typecheck`: TypeScript 검사
- `npm run lint`: Biome 검사

## Architecture

- `app/api/webhooks/threads`: Threads Webhook 수신
- `app/api/dashboard/*`: 운영 대시보드용 조회 API
- `src/server/worker/*`: 큐 소비, 상태 전이, LLM 실행, 답글 발행
- `src/server/threads/*`: Threads 토큰/답글 처리
- `src/server/llm/*`: OpenAI 호환 LLM 호출
- `src/server/db/*`: SQLite + Kysely 연결

## Deployment

### 1. GitHub 반영

```bash
git remote add origin https://github.com/gaon12/aether.git
git add .
git commit -m "Build Aether Threads bot dashboard"
git push -u origin master
```

### 2. Ubuntu 서버 준비

Node.js 24, npm, Apache2, PM2를 설치합니다.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs apache2
sudo npm install -g pm2
```

배포 디렉터리를 만들고 저장소를 받습니다.

```bash
sudo mkdir -p /var/www/aether
sudo chown -R $USER:$USER /var/www/aether
git clone https://github.com/gaon12/aether.git /var/www/aether
cd /var/www/aether
npm ci
```

### 3. 환경 변수와 빌드

`.env.example`을 참고해 `.env`를 작성한 뒤 마이그레이션과 빌드를 실행합니다.

```bash
cp .env.example .env
npm run migrate
npm run build
```

### 4. PM2 실행

웹 앱과 워커를 각각 PM2로 띄웁니다.

```bash
pm2 start npm --name aether-web -- start
pm2 start npm --name aether-worker -- run worker
pm2 save
pm2 startup
```

기본적으로 Next 앱은 `3000` 포트에서 동작합니다. 포트를 바꾸고 싶다면 `PORT=3000 npm start` 형태로 지정하세요.

### 5. Apache2 리버스 프록시

필수 모듈을 켭니다.

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel headers rewrite ssl
```

예시 vhost 파일 `/etc/apache2/sites-available/aether.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAdmin webmaster@localhost

    ProxyPreserveHost On
    ProxyRequests Off

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://127.0.0.1:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://127.0.0.1:3000/$1 [P,L]

    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"

    ErrorLog ${APACHE_LOG_DIR}/aether-error.log
    CustomLog ${APACHE_LOG_DIR}/aether-access.log combined
</VirtualHost>
```

사이트를 활성화하고 Apache를 재시작합니다.

```bash
sudo a2ensite aether.conf
sudo a2dissite 000-default.conf
sudo systemctl reload apache2
```

### 6. HTTPS 권장

실서비스에서는 Certbot으로 TLS를 붙이는 편이 좋습니다.

```bash
sudo apt-get install -y certbot python3-certbot-apache
sudo certbot --apache -d your-domain.com
```

### 7. 이후 업데이트

```bash
cd /var/www/aether
git pull origin master
npm ci
npm run build
pm2 restart aether-web
pm2 restart aether-worker
```
