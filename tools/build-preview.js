// ワイヤーフレームの仮公開用フォルダを dist/ に作る。
// 使い方: node tools/build-preview.js
//   dist/<フォルダ名>/   … このフォルダをサーバーにそのまま上げる（HTML 7枚・assets・pdf・.htaccess・.htpasswd）
//   dist/htpasswd/.htpasswd … Basic 認証のパスワードの元本（アップロードしない。公開フォルダにはコピーが入る）
//   dist/README_アップロード手順.txt … 手順と ID／パスワード
// docs/・ログ/・tools/・CLAUDE.md は社内資料なので入れない。
// .htpasswd は仮公開サーバーの共有の場所に置かず、この案件のフォルダの中に入れて .htaccess で直接開けないようにする。
// フォルダ名とパスワードは初回だけ作り、2回目以降は同じものを使う（ワイヤーを直したら再実行するだけ）。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const PAGES = ['index', 'products', 'product-detail', 'downloads', 'assembly', 'contact', 'company'];
const HTPASSWD_EXE = 'C:\\xampp\\apache\\bin\\htpasswd.exe';
const USER = 'toushin';

const rand = (n, chars = 'abcdefghijkmnpqrstuvwxyz23456789') =>
  Array.from(crypto.randomBytes(n), b => chars[b % chars.length]).join('');

// 文字化けが混ざったまま公開しない（2026-11-02 に company.html で起きた）
for (const p of PAGES) {
  if (/縺|陦ｨ|蠖｢/.test(fs.readFileSync(path.join(root, p + '.html'), 'utf8'))) {
    throw new Error(`${p}.html に文字化けがあります。直してから実行してください`);
  }
}

fs.mkdirSync(dist, { recursive: true });
const nameFile = path.join(dist, '.folder-name');
if (!fs.existsSync(nameFile)) fs.writeFileSync(nameFile, 'wf-' + rand(10));
const name = fs.readFileSync(nameFile, 'utf8').trim();
const out = path.join(dist, name);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// HTML：検索エンジンに出さない meta を足してコピー（元ファイルは触らない）
for (const p of PAGES) {
  const src = fs.readFileSync(path.join(root, p + '.html'), 'utf8');
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const html = src.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">${nl}<meta name="robots" content="noindex, nofollow">`);
  if (html === src) throw new Error(`${p}.html に <meta charset="UTF-8"> が見つかりません`);
  fs.writeFileSync(path.join(out, p + '.html'), html);
}
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'pdf'), path.join(out, 'pdf'), { recursive: true });

// デザイン案：design/top.html（切替バー付き）から、案ごとの単独ページ design/a.html・b.html・c.html を作る。
// 先方には案ごとに別の URL を送るので、切替バーと切替スクリプトは外し、CSS を固定で読み込む
const designSrc = path.join(root, 'design', 'top.html');
const DESIGNS = { a: 'A案', b: 'B案', c: 'C案' };
if (fs.existsSync(designSrc)) {
  const src = fs.readFileSync(designSrc, 'utf8');
  fs.mkdirSync(path.join(out, 'design'), { recursive: true });
  fs.cpSync(path.join(root, 'design', 'css'), path.join(out, 'design', 'css'), { recursive: true });
  for (const [d, label] of Object.entries(DESIGNS)) {
    const html = src
      .replace(/<!-- 案の切り替えバー[\s\S]*?<div class="dbar">[\s\S]*?<\/div>\s*/, '')
      .replace(/<script>[\s\S]*?<\/script>\s*/, '')
      .replace('href="css/a.css" id="theme"', `href="css/${d}.css"`)
      .replace('data-d="a"', `data-d="${d}"`)
      .replace(/<title>.*?<\/title>/, `<title>東進電機工業様｜トップページ デザイン ${label}</title>`);
    if (/dbar|<script>|id="theme"/.test(html)) throw new Error(`design/${d}.html の書き出しに失敗（切替バーが残っています）`);
    fs.writeFileSync(path.join(out, 'design', d + '.html'), html);
  }
  // design/ は dev.nextreservation.jp にも単独で上げる（~/bin/nr-dev-upload dist/<フォルダ名>/design toushindenki-design --go）。
  // そちらは Basic 認証がないので、検索エンジンに出さない指定だけはフォルダ単体でも効くようにしておく
  fs.writeFileSync(path.join(out, 'design', '.htaccess'),
    'Header set Cache-control no-cache\nHeader set X-Robots-Tag "noindex, nofollow"\n');
}

fs.writeFileSync(path.join(out, '.htaccess'), [
  '# キャッシュを毎回確認するようにする',
  'Header set Cache-control no-cache',
  '',
  '# 検索エンジンに出さない',
  'Header set X-Robots-Tag "noindex, nofollow"',
  '',
  '# Basic 認証（AuthUserFile は、このフォルダに置いた .htpasswd の「絶対パス」に書き換える）',
  'AuthType Basic',
  'AuthName "Wireframe Preview"',
  `AuthUserFile /ここをサーバー上の絶対パスに書き換える/${name}/.htpasswd`,
  'Require valid-user',
  '',
  '# .htpasswd・.htaccess をブラウザから開かせない（Apache の既定でも拒否されるが念のため明示）',
  '<FilesMatch "^\\.ht">',
  '  <IfModule mod_authz_core.c>',
  '    Require all denied',
  '  </IfModule>',
  '  <IfModule !mod_authz_core.c>',
  '    Order allow,deny',
  '    Deny from all',
  '  </IfModule>',
  '</FilesMatch>',
  '',
].join('\n'));

// パスワードは初回だけ作る。元本は dist/htpasswd/ に置き（アップロードしない）、公開フォルダにはコピーを入れる。
// .htpasswd の中身はハッシュで、パスワードそのものではない
const pwDir = path.join(dist, 'htpasswd');
const pwFile = path.join(pwDir, '.htpasswd');
const readme = path.join(dist, 'README_アップロード手順.txt');
const oldReadme = fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8') : '';
let pass = ((oldReadme.match(/^パスワード: (.+)$/m) || [])[1] || '').trim();
if (!fs.existsSync(pwFile) || !pass) {
  pass = rand(12, 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789');
  fs.mkdirSync(pwDir, { recursive: true });
  fs.writeFileSync(pwFile, execFileSync(HTPASSWD_EXE, ['-nbm', USER, pass], { encoding: 'utf8' }).trim() + '\n');
}
fs.copyFileSync(pwFile, path.join(out, '.htpasswd'));

fs.writeFileSync(readme, [
  '東進電機工業様 ワイヤーフレーム 仮公開の手順',
  '',
  `1. dist/${name}/ フォルダを、中身ごとサーバーの公開フォルダにアップロードする`,
  '   （.htaccess と .htpasswd は隠しファイルなので、FTP ソフトで隠しファイルを表示してから上げる）',
  '   ※ .htpasswd もこのフォルダの中に入っている。共有の場所には何も置かない',
  `2. サーバー上の ${name}/.htaccess の AuthUserFile の行を、そのフォルダの .htpasswd の絶対パスに書き換える`,
  `   例：AuthUserFile /home/アカウント名/public_html/${name}/.htpasswd`,
  '   ※ 書き換え忘れると 500 エラーになる',
  `3. https://（サーバー）/${name}/index.html を開き、ID とパスワードを聞かれることを確認する`,
  `4. https://（サーバー）/${name}/.htpasswd を開き、表示されない（403）ことを確認する`,
  '',
  `ID      : ${USER}`,
  `パスワード: ${pass}`,
  '',
  '先方には URL と ID／パスワードを別々のメールで送る。',
  'ワイヤーを直したら「node tools/build-preview.js」を再実行し、HTML・assets・pdf だけ上げ直す（フォルダ名とパスワードは変わらない）。',
  `仮公開をやめるときは、サーバー上の ${name}/ フォルダを丸ごと消せば .htpasswd も一緒に消える。`,
  'dist/htpasswd/ はパスワードの元本。アップロードしない。',
  '',
].join('\n'));

console.log(`ok: dist/${name}/ を作りました（HTML ${PAGES.length} 枚・assets・pdf・.htaccess・.htpasswd）`);
