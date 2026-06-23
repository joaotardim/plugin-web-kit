#!/usr/bin/env node
/**
 * csc-setup — telinha web local para criar e iniciar um projeto csc-web-kit.
 *
 * Sobe um servidor HTTP em 127.0.0.1 (somente loopback), abre o navegador num
 * formulário onde o usuário preenche empresa, nome, pasta, e-mail, SENHA (campo
 * mascarado) e o Entra secret (opcional). Ao enviar: cria o projeto, roda
 * `npm install` e `npm start`, e mostra os links do app quando os servidores sobem.
 *
 * Dados sensíveis (senha/secret) trafegam só pelo loopback e nunca passam pelo
 * chat nem por argumentos de linha de comando.
 */
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { listCompanies, defaultDestFor, scaffoldProject } from './lib/scaffold.mjs'

const HOST = '127.0.0.1'
const PORT_RANGE = Array.from({ length: 20 }, (_, i) => 4321 + i)
const TOKEN = randomBytes(16).toString('hex')
const IS_WIN = process.platform === 'win32'

// Estado global do fluxo (consultado via GET /status).
const state = {
  phase: 'form',      // form | creating | installing | starting | ready | error
  message: '',
  dest: null,
  projectName: null,
  logFile: null,
  urls: null,
}

const PB_HEALTH = 'http://127.0.0.1:8090/api/health'
const APP_URL = 'http://127.0.0.1:5173'
const PB_ADMIN = 'http://127.0.0.1:8090/_/'

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy() })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function probe(url) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    return r.ok || r.status === 404 // PB /_/ pode dar 200; health dá 200
  } catch { return false }
}

function logTail(n = 30) {
  if (!state.logFile || !existsSync(state.logFile)) return ''
  try {
    const lines = readFileSync(state.logFile, 'utf8').split('\n')
    return lines.slice(-n).join('\n')
  } catch { return '' }
}

function openBrowser(url) {
  try {
    const cmd = IS_WIN ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open'
    const args = IS_WIN ? ['/c', 'start', '', url] : [url]
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true })
    child.unref()
  } catch { /* sem navegador disponível — usuário abre manualmente */ }
}

// Roda npm install e depois npm start (detached), atualizando o estado.
function runProject(dest) {
  state.phase = 'installing'
  state.message = 'Instalando dependências (npm install)...'
  state.logFile = join(dest, '.web-kit-start.log')
  const out = createWriteStream(state.logFile, { flags: 'w' })

  const install = spawn('npm', ['install'], { cwd: dest, shell: true })
  install.stdout.pipe(out, { end: false })
  install.stderr.pipe(out, { end: false })

  install.on('close', (code) => {
    if (code !== 0) {
      state.phase = 'error'
      state.message = `npm install falhou (código ${code}). Veja o log.`
      return
    }
    state.phase = 'starting'
    state.message = 'Subindo PocketBase + Vite (npm start)... o primeiro start baixa o binário do PocketBase.'

    // npm start é um servidor de longa duração — detached para sobreviver ao
    // encerramento desta telinha; logs vão para o arquivo.
    const start = spawn('npm', ['start'], {
      cwd: dest, shell: true, detached: true,
      stdio: ['ignore', out, out],
    })
    start.unref()

    // Polling de prontidão: PocketBase (:8090) e Vite (:5173).
    const deadline = Date.now() + 10 * 60 * 1000 // 10 min
    const timer = setInterval(async () => {
      if (state.phase === 'ready' || state.phase === 'error') { clearInterval(timer); return }
      const [pb, app] = await Promise.all([probe(PB_HEALTH), probe(APP_URL)])
      if (pb && app) {
        state.phase = 'ready'
        state.message = 'Tudo no ar!'
        state.urls = { app: APP_URL, admin: PB_ADMIN }
        clearInterval(timer)
      } else if (Date.now() > deadline) {
        state.phase = 'error'
        state.message = 'Tempo esgotado aguardando os servidores. Veja o log para diagnosticar.'
        clearInterval(timer)
      }
    }, 2000)
  })
}

// ── Página (formulário) ────────────────────────────────────────────────────
function formHtml() {
  const companies = listCompanies()
  const options = companies.map(c => `<option value="${c.key}">${c.name}</option>`).join('')
  const home = homedir().replace(/\\/g, '/')
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>web-kit — criar projeto</title>
<style>
  :root { --bg:#0b1020; --card:#141a2e; --field:#0f1626; --line:#27304a; --accent:#0f62fe; --accent2:#0353e9; --text:#e8ecf6; --muted:#9aa4bf; --ok:#16a34a; --err:#da1e28; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:radial-gradient(1200px 600px at 50% -10%, #1a2440 0, var(--bg) 60%); color:var(--text); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:32px; }
  .card { width:100%; max-width:560px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:32px; box-shadow:0 20px 60px rgba(0,0,0,.45); }
  h1 { margin:0 0 4px; font-size:22px; letter-spacing:-.02em; }
  p.sub { margin:0 0 24px; color:var(--muted); font-size:14px; }
  label { display:block; font-size:13px; color:var(--muted); margin:16px 0 6px; }
  input, select { width:100%; padding:11px 12px; background:var(--field); border:1px solid var(--line); border-radius:9px; color:var(--text); font-size:14px; outline:none; transition:border-color .15s; }
  input:focus, select:focus { border-color:var(--accent); }
  .row { display:flex; gap:12px; }
  .row > div { flex:1; }
  .hint { font-size:12px; color:var(--muted); margin-top:5px; }
  button { width:100%; margin-top:24px; padding:13px; background:var(--accent); color:#fff; border:none; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
  button:hover { background:var(--accent2); }
  button:disabled { opacity:.6; cursor:not-allowed; }
  .err { color:var(--err); font-size:13px; margin-top:12px; min-height:18px; }
  #status { display:none; margin-top:20px; }
  .step { display:flex; align-items:center; gap:10px; font-size:14px; padding:7px 0; color:var(--muted); }
  .step.active { color:var(--text); }
  .step.done { color:var(--ok); }
  .dot { width:9px; height:9px; border-radius:50%; background:var(--line); flex:none; }
  .step.active .dot { background:var(--accent); box-shadow:0 0 0 4px rgba(15,98,254,.2); }
  .step.done .dot { background:var(--ok); }
  .links a { display:block; margin-top:10px; padding:12px; background:var(--field); border:1px solid var(--line); border-radius:9px; color:var(--text); text-decoration:none; font-weight:600; }
  .links a:hover { border-color:var(--accent); }
  pre { background:#0a0f1c; border:1px solid var(--line); border-radius:8px; padding:12px; font-size:11px; color:var(--muted); max-height:160px; overflow:auto; white-space:pre-wrap; margin-top:14px; display:none; }
  .badge { font-size:11px; color:var(--muted); border:1px solid var(--line); padding:3px 8px; border-radius:999px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Criar projeto <span class="badge">web-kit</span></h1>
    <p class="sub">Preencha os dados abaixo. A senha e o secret ficam só na sua máquina (loopback) — nunca passam pelo chat.</p>

    <form id="f">
      <label>Empresa</label>
      <select name="company" id="company">${options}</select>

      <label>Nome do projeto</label>
      <input name="name" id="name" placeholder="mvp-fotus" autocomplete="off">

      <label>Pasta de destino</label>
      <input name="dest" id="dest" autocomplete="off">
      <div class="hint">Caminho absoluto, fora do plugin.</div>

      <label>E-mail do superusuário (admin do PocketBase)</label>
      <input name="email" id="email" type="email" placeholder="admin@empresa.com" autocomplete="off">

      <div class="row">
        <div>
          <label>Senha (mín. 10)</label>
          <input name="password" id="password" type="password" autocomplete="new-password">
        </div>
        <div>
          <label>Confirmar senha</label>
          <input name="confirm" id="confirm" type="password" autocomplete="new-password">
        </div>
      </div>

      <label>Entra Client Secret (opcional)</label>
      <input name="secret" id="secret" type="password" autocomplete="new-password" placeholder="deixe vazio se não for configurar OAuth agora">

      <div class="err" id="err"></div>
      <button type="submit" id="submit">Criar e iniciar</button>
    </form>

    <div id="status">
      <div class="step" data-k="creating"><span class="dot"></span> Criar projeto</div>
      <div class="step" data-k="installing"><span class="dot"></span> Instalar dependências</div>
      <div class="step" data-k="starting"><span class="dot"></span> Subir PocketBase + Vite</div>
      <div class="step" data-k="ready"><span class="dot"></span> Pronto</div>
      <div class="links" id="links"></div>
      <pre id="log"></pre>
    </div>
  </div>

<script>
  const TOKEN = ${JSON.stringify(TOKEN)};
  const HOME = ${JSON.stringify(home)};
  const ORDER = ['creating','installing','starting','ready'];
  const nameEl = document.getElementById('name');
  const destEl = document.getElementById('dest');
  const companyEl = document.getElementById('company');

  function suggestName(){ return 'mvp-' + companyEl.value; }
  function refreshDest(){
    const n = (nameEl.value || suggestName()).trim();
    destEl.value = HOME + '/projetos/' + n;
  }
  companyEl.addEventListener('change', () => { if(!nameEl.value) nameEl.placeholder = suggestName(); refreshDest(); });
  nameEl.addEventListener('input', refreshDest);
  refreshDest();

  const f = document.getElementById('f');
  const err = document.getElementById('err');
  const submit = document.getElementById('submit');
  const statusBox = document.getElementById('status');

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const data = Object.fromEntries(new FormData(f).entries());
    if (!data.name) data.name = suggestName();
    if (!data.dest) data.dest = HOME + '/projetos/' + data.name;
    if ((data.password || '').length < 10) { err.textContent = 'Senha precisa ter no mínimo 10 caracteres.'; return; }
    if (data.password !== data.confirm) { err.textContent = 'As senhas não conferem.'; return; }
    if (!/.+@.+\\..+/.test(data.email || '')) { err.textContent = 'E-mail inválido.'; return; }

    submit.disabled = true; submit.textContent = 'Criando...';
    try {
      const r = await fetch('/create?t=' + TOKEN, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!j.ok) { err.textContent = j.error || 'Erro ao criar.'; submit.disabled = false; submit.textContent = 'Criar e iniciar'; return; }
      f.style.display = 'none';
      statusBox.style.display = 'block';
      poll();
    } catch (e2) {
      err.textContent = 'Falha de conexão: ' + e2.message;
      submit.disabled = false; submit.textContent = 'Criar e iniciar';
    }
  });

  function setSteps(phase){
    const idx = ORDER.indexOf(phase === 'creating' ? 'creating' : phase);
    document.querySelectorAll('.step').forEach(el => {
      const k = el.dataset.k;
      const ki = ORDER.indexOf(k);
      el.classList.remove('active','done');
      if (phase === 'ready') { el.classList.add('done'); }
      else if (ki < idx) el.classList.add('done');
      else if (ki === idx) el.classList.add('active');
    });
  }

  async function poll(){
    try {
      const r = await fetch('/status?t=' + TOKEN);
      const s = await r.json();
      setSteps(s.phase);
      const log = document.getElementById('log');
      if (s.logTail) { log.style.display='block'; log.textContent = s.logTail; log.scrollTop = log.scrollHeight; }
      if (s.phase === 'ready' && s.urls) {
        document.getElementById('links').innerHTML =
          '<a href="'+s.urls.app+'" target="_blank">Abrir o app → '+s.urls.app+'</a>' +
          '<a href="'+s.urls.admin+'" target="_blank">PocketBase Admin → '+s.urls.admin+'</a>';
        return;
      }
      if (s.phase === 'error') { document.getElementById('err').textContent = s.message; document.getElementById('err').style.display='block'; document.querySelector('.err').style.color = '#da1e28'; return; }
      setTimeout(poll, 1500);
    } catch { setTimeout(poll, 2000); }
  }
</script>
</body>
</html>`
}

// ── Servidor ─────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`)
  // Token obrigatório em todas as rotas (proteção contra outras páginas locais).
  if (url.searchParams.get('t') !== TOKEN) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Token inválido. Abra a URL exata impressa no terminal.')
    return
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(formHtml())
    return
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    json(res, 200, { phase: state.phase, message: state.message, urls: state.urls, logTail: logTail() })
    return
  }

  if (req.method === 'POST' && url.pathname === '/create') {
    try {
      const body = JSON.parse(await readBody(req) || '{}')
      state.phase = 'creating'
      state.message = 'Copiando template...'
      const { dest, projectName } = scaffoldProject({
        company: body.company, name: body.name, dest: body.dest,
        email: body.email, password: body.password, secret: body.secret,
      })
      state.dest = dest
      state.projectName = projectName
      json(res, 200, { ok: true, dest })
      runProject(dest) // assíncrono — o cliente acompanha via /status
    } catch (err) {
      state.phase = 'form'
      json(res, 400, { ok: false, error: err instanceof Error ? err.message : String(err) })
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

// Tenta as portas do range até achar uma livre.
function listen(ports) {
  if (!ports.length) { console.error('Erro: nenhuma porta livre no range.'); process.exit(1) }
  const [port, ...rest] = ports
  server.once('error', (e) => {
    if (e.code === 'EADDRINUSE') listen(rest)
    else { console.error('Erro ao subir o servidor:', e.message); process.exit(1) }
  })
  server.listen(port, HOST, () => {
    const link = `http://${HOST}:${port}/?t=${TOKEN}`
    console.log('')
    console.log('  Telinha de criação do projeto:')
    console.log(`  → ${link}`)
    console.log('')
    console.log('  (somente local; mantenha este processo rodando até o projeto subir)')
    openBrowser(link)
  })
}

listen(PORT_RANGE)
