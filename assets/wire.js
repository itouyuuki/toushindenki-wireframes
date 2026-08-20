(function(){
  var b=document.body,
      canvas=document.querySelector('.canvas'),
      pc=document.getElementById('bPC'),
      sp=document.getElementById('bSP');

  /* ---------- ハンバーガーメニュー（全ページ共通で自動生成） ---------- */
  var CATS=['AHD500万画素カメラ','AHDレコーダー','microSDカード録画カメラ','SDカード録画カメラ',
            'PoEカメラ＆PoEレコーダー','ネットワークカメラ＆レコーダー','ダミーカメラ','周辺機器／アクセサリー'];
  var DLS=['取扱説明書','仕様書','図面','アップデートバージョン'];
  var CONTACTS=['製品問い合わせ','販売協力店申請','工事店・施工店の協力店申請','製造委託'];

  function buildDrawer(){
    var hd=document.querySelector('.hd');
    if(!hd||document.querySelector('.drawer'))return;

    var d=document.createElement('div');
    d.className='drawer';
    d.innerHTML=
      '<div class="dhead">'+
        '<div class="ph logo"><span>ロゴ</span></div>'+
        '<div class="dclose">×</div>'+
      '</div>'+
      '<a class="ditem">ホーム</a>'+
      '<div class="dacc open">'+
        '<div class="ditem acc">製品情報<i>＋</i></div>'+
        '<div class="dsub">'+CATS.map(function(c){return '<a>'+c+'</a>';}).join('')+'</div>'+
      '</div>'+
      '<div class="dacc">'+
        '<div class="ditem acc">ダウンロード<i>＋</i></div>'+
        '<div class="dsub">'+DLS.map(function(c){return '<a>'+c+'</a>';}).join('')+'</div>'+
      '</div>'+
      '<div class="dacc">'+
        '<div class="ditem acc">お問い合わせ<i>＋</i></div>'+
        '<div class="dsub">'+CONTACTS.map(function(c){return '<a>'+c+'</a>';}).join('')+'</div>'+
      '</div>'+
      '<a class="ditem">会社案内</a>'+
      '<a class="ditem">電子機器組立事業</a>'+
      '<div class="dbtn">お問い合わせフォーム</div>';
    hd.parentNode.insertBefore(d,hd.nextSibling);

    var burger=document.querySelector('.burger');
    if(burger)burger.onclick=function(){d.classList.add('open');};
    d.querySelector('.dclose').onclick=function(){d.classList.remove('open');};
    d.querySelectorAll('.ditem.acc').forEach(function(a){
      a.onclick=function(){a.parentNode.classList.toggle('open');};
    });

  }

  /* ---------- 編集区分の凡例（全ページ共通で自動生成） ---------- */
  function buildLegend(){
    var wire=document.querySelector('.wire');
    if(!wire||document.querySelector('.legend'))return;
    var l=document.createElement('div');
    l.className='legend';
    l.innerHTML=
      '<div class="ltitle">この色は「御社で変更できるかどうか」を表しています</div>'+
      '<div class="litem"><i class="k-fix"></i><b>変更できません</b>'+
        'デザイン・レイアウト・共通部分です。変更はご依頼ください</div>'+
      '<div class="litem"><i class="k-auto"></i><b>登録して変更</b>'+
        '管理画面から登録・修正した内容が、そのままここに表示されます'+
        '（製品名・型番・特徴・写真・お知らせなど）</div>'+
      '<div class="litem"><i class="k-edit"></i><b>自由に記入</b>'+
        '文章を自由に書ける欄です。WordPress の仕様上、'+
        '<b style="min-width:0">1ページに1箇所だけ</b>しか設けられません</div>';
    wire.insertBefore(l,wire.firstChild);
  }

  /* 画面幅が足りないときは全体を縮小して横スクロールを出さない */
  function refresh(){
    if(!canvas)return;
    canvas.style.zoom='';
    var need=b.classList.contains('sp')?375:1000;
    var avail=document.documentElement.clientWidth-48;
    canvas.style.zoom = avail<need ? (avail/need) : '';
  }

  if(pc)pc.onclick=function(){b.classList.remove('sp');pc.classList.add('on');sp.classList.remove('on');window.scrollTo(0,0);refresh();};
  if(sp)sp.onclick=function(){b.classList.add('sp');sp.classList.add('on');pc.classList.remove('on');window.scrollTo(0,0);refresh();};

  buildDrawer();
  buildLegend();
  window.addEventListener('load',refresh);
  window.addEventListener('resize',refresh);
  refresh();
})();
