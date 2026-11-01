// 11/2 打合せ資料（伊藤さんが Word で直接編集済み）への追記。edit-docx.js の仕組みで直接書き換える。
// ① 先頭に「前回お打合せで社内検討とした事項のご報告」の章と表を足す（S の表を複製して作る）
// ② 削除で飛んだ Q・S の番号を詰める
// 使い方: node tools/docs/edits/<このファイル>.js <対象.docx>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const docx = process.argv[2];
try { fs.closeSync(fs.openSync(docx, 'r+')); } catch { throw new Error(path.basename(docx) + ' が Word などで開かれています。閉じてから再実行してください'); }
fs.copyFileSync(docx, docx.replace(/\.docx$/i, '.bak.docx'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docxedit-'));
const ps = c => execSync(`powershell -NoProfile -Command "Add-Type -A System.IO.Compression.FileSystem; ${c}"`);
ps(`[IO.Compression.ZipFile]::ExtractToDirectory('${docx}', '${dir}')`);
const docPath = path.join(dir, 'word/document.xml');
let x = fs.readFileSync(docPath, 'utf8');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = xml => (xml.match(/<w:t(?: [^>]*)?>[^<]*/g) || []).map(v => v.replace(/<w:t[^>]*>/, '')).join('');
const noIds = s => s.replace(/ w14:paraId="[^"]*"| w14:textId="[^"]*"/g, '');
const paras = () => [...x.matchAll(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?<\/w:p>/g)].map(m => ({ xml: m[0], i: m.index, text: textOf(m[0]) }));
const one = (list, pred, label) => {
  const hit = list.filter(pred);
  if (hit.length !== 1) throw new Error(`${label}: ${hit.length} 件一致`);
  return hit[0];
};
// 段落を、同じ書式で別の文字に（先頭 run の書式を引き継ぐ）
function paraLike(pXml, text) {
  const pPr = (pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const rPr = (pXml.match(/<w:r[ >][\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)/) || [, ''])[1];
  return noIds(`${pXml.match(/^<w:p[^>]*>/)[0]}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`);
}

// ---------- ① ご報告の章 ----------
const REPORT = [
  ['No', '前回いただいたご要望', '社内検討の結果'],
  ['1', ['型番検索', '「ないと困る」。型番だけでも探せるように'], [
    '型番検索の仕組みを独自に構築します',
    '型番の一部だけでも、大文字・小文字やハイフンの有無を問わず検索できます（ワイヤーのとおり）',
    '結果は「完全に一致」→「先頭が一致」→「一部が一致」の順に表示します',
    'ダウンロード資料も同じ検索で探せます',
  ]],
  ['2', ['製品一覧の見せ方', '製品一覧は「なくてもいい」'], [
    '製品一覧は出さず、カテゴリー7項目のカードから辿っていただく形にします',
    'カテゴリーの写真と並び順は、御社で変更できるようにします',
  ]],
  ['3', ['ダウンロード一覧の見せ方', '型番で探す。一覧は出さない'], [
    '型番検索を中央に大きく配置します',
    '一覧は最初は出さず、カテゴリーを選んだらその製品の資料だけを表示します',
    '資料は情報を入力せず、そのままダウンロードできます',
  ]],
  ['4', ['対応アクセサリーの紐づけ', '製品ページに対応アクセサリーを入れる'], [
    '製品ページ側で対応アクセサリーを登録すると、製品ページの下に自動で表示されます',
    '紐づけの元データについては Q3 でご確認させてください',
  ]],
  ['5', ['製品ページからのお問い合わせ', '型番・品名が自動で入る形'], [
    '現在、弊社で技術検証を進めています',
    '結果がまとまり次第、ご報告いたします',
  ]],
];

const firstTbl = x.indexOf('<w:tbl>');
const H1 = one(paras(), p => p.text === '確認させていただきたいこと' && p.i < firstTbl, 'H1 確認させていただきたいこと');
const sStart = x.indexOf('<w:tbl>', x.indexOf('ご提案・ご説明'));
const sTbl = x.slice(sStart, x.indexOf('</w:tbl>', sStart) + 8);
const sRows = sTbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g);
const [headRow, bodyRow] = [sRows[0], sRows[1]];
const fillRow = (rowXml, cells) => {
  let k = 0;
  return noIds(rowXml).replace(/<w:tc>([\s\S]*?)<\/w:tc>/g, (all, inner) => {
    const tcPr = (inner.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0];
    const p = inner.match(/<w:p[ >][\s\S]*?<\/w:p>/)[0];
    const c = cells[k++];
    return `<w:tc>${tcPr}${(Array.isArray(c) ? c : [c]).map(t => paraLike(p, t)).join('')}</w:tc>`;
  });
};
const tblOpen = sTbl.slice(0, sTbl.indexOf(sRows[0]));
const newTbl = tblOpen + fillRow(headRow, REPORT[0]) + REPORT.slice(1).map(r => fillRow(bodyRow, r)).join('') + '</w:tbl>';

const bodyP = one(paras(), p => p.text.startsWith('いずれも、納品時に'), 'BODY 見本');
const reportHead = paraLike(H1.xml, '前回お打合せで社内検討とした事項のご報告');
const lead = paraLike(bodyP.xml, '8/5 のお打合せで「社内で検討します」とお預かりした事項について、検討の結果をご報告します。');
x = x.slice(0, H1.i) + reportHead + lead + newTbl + x.slice(H1.i);

// ---------- ② 番号を詰める（セルの中身が番号だけの <w:t> を対象） ----------
const renumber = (prefix, order) => {
  order.forEach((old, idx) => {
    const re = new RegExp(`(<w:t(?: [^>]*)?>)${prefix}${old}(</w:t>)`, 'g');
    const hits = x.match(re) || [];
    if (hits.length !== 1) throw new Error(`${prefix}${old}: ${hits.length} 件一致`);
    x = x.replace(re, `$1${prefix}__${idx + 1}$2`);
  });
  x = x.replace(new RegExp(`${prefix}__(\\d+)`, 'g'), `${prefix}$1`);
};
renumber('Q', [1, 3, 4, 5, 6, 8, 11, 12]);
renumber('S', [1, 4, 5, 6, 7]);

// Q4（旧）→ Q3 の理由欄を、ご報告4 と重複しない言い方に
const oldReason = '製品ページ側で対応アクセサリーを登録する方式を考えています。御社の実態に合うかの確認です';
if ((x.match(new RegExp(oldReason)) || []).length !== 1) throw new Error('Q3 理由欄が見つからない');
x = x.replace(oldReason, 'ご報告4の方式が、御社の実態に合うかの確認です');

// S3（旧 S5）：01／02 のレイアウトは会社案内ではなく電子機器組立事業ページにある。会社案内で正しい内容だけにする
const setPara = (oldText, newText) => {
  const p = one(paras(), p => p.text === oldText, `段落 ${oldText}`);
  x = x.slice(0, p.i) + paraLike(p.xml, newText) + x.slice(p.i + p.xml.length);
};
setPara('会社案内の 01／02 のレイアウトは固定（編集不可）としたい', '会社案内の「会社概要」「沿革」は、1つの編集画面で続けてご記入いただく形にしたい');
setPara('凝ったレイアウトのため、編集できるようにすると崩れやすくなります。会社概要と沿革は、1つの編集画面で続けてご記入いただきます',
  'WordPress の仕様で、自由に記入できる欄は1ページに1か所のためです。どちらも表の形でご記入いただけます（ワイヤーの会社案内⑤⑥）');

fs.writeFileSync(docPath, x);
const tmpOut = path.join(os.tmpdir(), `docxedit-${Date.now()}.docx`);
ps(`Add-Type -A System.IO.Compression;$z=[IO.Compression.ZipFile]::Open('${tmpOut}','Create');` +
   `Get-ChildItem -Recurse -File '${dir}' | Sort-Object { if($_.Name -eq '[Content_Types].xml'){0}else{1} } | % { [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z,$_.FullName,$_.FullName.Substring('${dir}'.Length+1).Replace('\\','/')) };$z.Dispose()`);
fs.copyFileSync(tmpOut, docx);
console.log('ok', docx);
