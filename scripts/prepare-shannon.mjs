// Creates a disposable source-only Docker context. Never reads a clinic database or .env.
import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const target = resolve(root, '..', 'maryam-shannon-isolated-20261009');
if (existsSync(target)) throw new Error(`Refusing to overwrite ${target}`);
mkdirSync(target);
cpSync(join(root, 'scripts/verify-shannon.mjs'), join(target, 'verify.mjs'));
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.mjs', 'postcss.config.mjs', 'prisma.config.ts']) {
  if (existsSync(join(root, file))) cpSync(join(root, file), join(target, file));
}
for (const dir of ['src', 'messages']) cpSync(join(root, dir), join(target, dir), {
  recursive: true, filter: p => !p.includes(`${dir === 'src' ? 'src' : 'messages'}/tests`) && !/[\\/]tests(?:[\\/]|$)/.test(p),
});
mkdirSync(join(target, 'prisma'));
cpSync(join(root, 'prisma/schema.prisma'), join(target, 'prisma/schema.prisma'));
mkdirSync(join(target, 'public')); // No owner-uploaded media is copied.
writeFileSync(join(target, '.dockerignore'), '.env*\n*.db*\n.next*\nnode_modules\n');
writeFileSync(join(target, 'proxy.mjs'), `import http from 'node:http';
const server = http.createServer((incoming, outgoing) => {
  // Fixed destination: never accept an upstream URL or implement CONNECT.
  const upstream = http.request({ hostname: 'app', port: 3050, path: incoming.url, method: incoming.method, headers: incoming.headers }, response => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers); response.pipe(outgoing);
  });
  upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end('Isolated app unavailable'); });
  incoming.pipe(upstream);
});
server.on('connect', (_, socket) => socket.end('HTTP/1.1 405 Method Not Allowed\\r\\n\\r\\n'));
server.listen(3050, '0.0.0.0');
`);
writeFileSync(join(target, 'Dockerfile'), `FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY . .
RUN DATABASE_URL=file:/data/shannon-pentest.db node node_modules/prisma/build/index.js generate
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=development
CMD ["node", "node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "0.0.0.0", "--port", "3050"]
`);
// Snapshot-only DB guard, applied at the actual adapter construction boundary.
const prismaFile = join(target, 'src/lib/prisma.ts');
let source = readFileSync(prismaFile, 'utf8');
source = source.replace('function createPrismaClient(): PrismaClient {', `function createPrismaClient(): PrismaClient {
  if (env.databaseUrl !== 'file:/data/shannon-pentest.db' || process.env.DATABASE_AUTH_TOKEN) {
    throw new Error('Isolation violation: database adapter refused');
  }`);
writeFileSync(prismaFile, source);
mkdirSync(join(target, 'src/app/api/isolation-proof'), { recursive: true });
writeFileSync(join(target, 'src/app/api/isolation-proof/route.ts'), `import { prisma } from '@/lib/prisma';
export async function GET() {
  const databases = await prisma.$queryRawUnsafe('PRAGMA database_list');
  const marker = await prisma.customer.findUnique({ where: { email: 'customer@pentest.invalid' }, select: { name: true } });
  return new Response(JSON.stringify({ databases, marker, notification: process.env.NOTIFICATION_PROVIDER, payment: process.env.PAYMENT_PROVIDER, authTokenPresent: Boolean(process.env.DATABASE_AUTH_TOKEN) }, (_, value) => typeof value === 'bigint' ? String(value) : value), { headers: { 'Content-Type': 'application/json' } });
}
`);
writeFileSync(join(target, 'seed.mjs'), `import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { writeFileSync } from 'node:fs';
if (process.env.DATABASE_URL !== 'file:/data/shannon-pentest.db' || process.env.DATABASE_AUTH_TOKEN) throw Error('Unsafe DB');
const db = new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL }) });
if (await db.adminUser.count() || await db.customer.count()) throw Error('Refusing to reseed existing database');
await db.adminUser.create({ data: { email: 'admin@pentest.invalid', name: 'Synthetic Test Admin', passwordHash: await hash('Pentest-Only-Admin-2026!', 12) } });
const customer = await db.customer.create({ data: { email: 'customer@pentest.invalid', name: 'SHANNON_SYNTHETIC_ONLY', phone: '+15145550101' } });
const service = await db.service.create({ data: { slug: 'pentest-service', name: 'Synthetic Test Treatment', nameFr: 'Soin fictif', price: 1000, duration: 30 } });
const staff = await db.staff.create({ data: { slug: 'pentest-staff', name: 'Synthetic Specialist', services: { create: { serviceId: service.id } } } });
const booking = await db.booking.create({ data: { ref: 'PENTEST-REQUEST-001', customerId: customer.id, serviceId: service.id, staffId: staff.id, startUtc: new Date('2026-11-01T15:00:00Z'), endUtc: new Date('2026-11-01T15:30:00Z'), priceTotal: 1000 } });
await db.product.create({ data: { slug: 'pentest-product', sku: 'PENTEST-001', name: 'Synthetic Test Product', nameFr: 'Produit fictif', price: 1000, stock: 100, demo: false } });
await db.businessSetting.create({ data: { email: 'salon@pentest.invalid', name: 'Synthetic Pentest Salon' } });
await db.storeSetting.create({ data: { enabled: true } });
await db.customer.create({ data: { email: 'second-customer@pentest.invalid', name: 'Synthetic Second Customer', phone: '+15145550102' } });
const token = await new SignJWT({ cust: customer.id, purpose: 'booking' }).setProtectedHeader({ alg: 'HS256' }).setSubject(booking.id).setIssuer('maryam-beauty-clinic').setIssuedAt().setExpirationTime('30d').sign(new TextEncoder().encode(process.env.BOOKING_LINK_SECRET));
writeFileSync('/data/synthetic-links.json', JSON.stringify({ booking: 'http://localhost:3050/en/booking/' + booking.ref + '?t=' + token }, null, 2));
console.log('Synthetic fixtures initialized. No source database read.');
await db.$disconnect();
`);
writeFileSync(join(target, 'compose.yaml'), `services:
  app:
    build: .
    image: maryam-shannon-isolated:20261009
    container_name: maryam-shannon-isolated
    environment:
      DATABASE_URL: file:/data/shannon-pentest.db
      DATABASE_AUTH_TOKEN: ""
      NEXT_PUBLIC_BASE_URL: http://host.docker.internal:3050
      BOOKING_LINK_SECRET: isolated-pentest-only-signing-key-20261009
      ADMIN_SESSION_COOKIE: shannon_admin_session
      NOTIFICATION_PROVIDER: mock
      PAYMENT_PROVIDER: mock
      ADMIN_NOTIFICATION_EMAIL: salon@pentest.invalid
      RESEND_API_KEY: ""
      STRIPE_SECRET_KEY: ""
      STRIPE_WEBHOOK_SECRET: ""
    volumes:
      - data:/data
    networks: [isolated]
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
  proxy:
    image: maryam-shannon-isolated:20261009
    container_name: maryam-shannon-isolated-proxy
    command: ["node", "/proxy.mjs"]
    ports:
      - "127.0.0.1:3050:3050"
    volumes:
      - ./proxy.mjs:/proxy.mjs:ro
    networks: [isolated, ingress]
    depends_on: [app]
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
networks:
  isolated:
    internal: true
  ingress:
volumes:
  data:
`);
writeFileSync(join(target, 'launch.ps1'), `Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (Get-NetTCPConnection -LocalPort 3050 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 3050 is occupied. Refusing to replace its server.' }
docker compose up -d --no-build app proxy
if ($LASTEXITCODE -ne 0) { throw 'Isolated server failed to start' }
$ready = $false
for ($attempt=0; $attempt -lt 30; $attempt++) {
  try { $proof = Invoke-RestMethod -Uri 'http://localhost:3050/api/isolation-proof' -TimeoutSec 5; if ($proof.marker.name -eq 'SHANNON_SYNTHETIC_ONLY') { $ready=$true; break } } catch {}
  Start-Sleep -Seconds 1
}
if ($ready) { node ./verify.mjs $PSScriptRoot; $ready = ($LASTEXITCODE -eq 0) }
if (-not $ready) { docker compose stop proxy app; throw 'Isolation verification failed; isolated app stopped. Do not enable Shannon.' }
`);
console.log(target);
execFileSync('docker', ['compose', 'build'], { cwd: target, stdio: 'inherit' });
execFileSync('docker', ['compose', 'run', '--rm', '--no-deps', 'app', 'node', 'node_modules/prisma/build/index.js', 'db', 'push'], { cwd: target, stdio: 'inherit' });
execFileSync('docker', ['compose', 'run', '--rm', '--no-deps', 'app', 'node', 'seed.mjs'], { cwd: target, stdio: 'inherit' });
console.log(`Prepared. Launch only the isolated app with: & '${join(target, 'launch.ps1')}'`);
