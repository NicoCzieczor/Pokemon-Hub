// ── Typ-Rechner Icon (zufälliger Typ aus dem Sprite-Sheet) ──
const _T=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
const _SP={Grass:[0,0],Fire:[1,0],Water:[2,0],Electric:[3,0],Normal:[4,0],Fighting:[0,1],Dark:[1,1],Steel:[2,1],Dragon:[3,1],Fairy:[4,1],Bug:[0,2],Flying:[1,2],Ghost:[2,2],Poison:[3,2],Psychic:[4,2],Ground:[0,3],Rock:[1,3],Ice:[3,3]};
const _CE={Grass:[115,109],Fire:[103.5,111],Water:[115,110.5],Electric:[112,111],Normal:[104.5,110],Fighting:[114,108],Dark:[106,107],Steel:[113.5,108],Dragon:[112,108],Fairy:[104,108],Bug:[111,102.5],Flying:[105,102],Ghost:[114,101.5],Poison:[113,103],Psychic:[105,105],Ground:[108,96.5],Rock:[104,94],Ice:[116,95.5]};
const _t=_T[Math.floor(Math.random()*_T.length)],_ICON=144;
const[_c,_r]=_SP[_t],[_cx,_cy]=_CE[_t]??[108,119];
// Alles in Prozent der Icon-Größe (die setzt mobile.css), damit das Icon mit der Kachel mitwächst
const _bsW=1080/_ICON,_bsH=956/_ICON;
const _bpX=(0.5-(_c*216+_cx)/_ICON)/(1-_bsW)*100,_bpY=(0.5-(_r*239+_cy)/_ICON)/(1-_bsH)*100;
const _te=document.getElementById('hub-type-icon');
if(_te){const s=document.createElement('span');s.style.background=`url('./Typrechner/Types.png') ${_bpX}% ${_bpY}%/${_bsW*100}% ${_bsH*100}% no-repeat`;_te.appendChild(s);}

// ── Ball & Pokédex Icons ──
const BALLS=['poke-ball','great-ball','ultra-ball','master-ball','safari-ball','net-ball','dive-ball','nest-ball','repeat-ball','timer-ball','luxury-ball','premier-ball','dusk-ball','heal-ball','quick-ball','moon-ball','dream-ball','beast-ball','friend-ball','love-ball','lure-ball','level-ball','fast-ball','heavy-ball','sport-ball','cherish-ball'];
const _item=n=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${n}.png`;
[['catchrate',_item(BALLS[Math.floor(Math.random()*BALLS.length)])],['pokedex','./img/dp-pokedex.png']].forEach(([id,src])=>{
  const el=document.getElementById('icon-'+id);if(!el)return;
  const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';el.appendChild(img);
});

// ── i18n ──
const TR={
  de:{
    'group-run':'Dein Run','group-team':'Team & Kämpfe','group-calc':'Rechner','group-ref':'Nachschlagen',
    'rundashboard-name':'Dashboard','saveviewer-name':'Save-Viewer','pokedex-name':'Pokédex','rules-name':'Regelwerk','map-name':'Karte','bosses-name':'Bosse','editor-name':'Save-Editor','rando-name':'Randomizer',
    'solo-name':'Solo','duo-name':'Duo','trio-name':'Trio',
    'catchrate-name':'Fangrate','damage-name':'Schaden','typcalc-name':'Typen',
    'backup-export':'Daten sichern','backup-import':'Daten laden',
    'ai-notice':'Erstellt mit KI-Unterstützung',
    'footer':'Pokémon und alle zugehörigen Namen sind Marken von Nintendo / Game Freak.',
  },
  en:{
    'group-run':'Your run','group-team':'Team & battles','group-calc':'Calculators','group-ref':'Reference',
    'rundashboard-name':'Dashboard','saveviewer-name':'Save Viewer','pokedex-name':'Pokédex','rules-name':'Rulebook','map-name':'Map','bosses-name':'Bosses','editor-name':'Save Editor','rando-name':'Randomizer',
    'solo-name':'Solo','duo-name':'Duo','trio-name':'Trio',
    'catchrate-name':'Catch Rate','damage-name':'Damage','typcalc-name':'Types',
    'backup-export':'Back up data','backup-import':'Restore data',
    'ai-notice':'Built with AI assistance',
    'footer':'Pokémon and all related names are trademarks of Nintendo / Game Freak.',
  },
};
let lang=localStorage.getItem('hub-lang')||'de';
const btn=document.getElementById('lang-btn');
function applyLang(l){lang=l;localStorage.setItem('hub-lang',l);document.documentElement.lang=l;btn.textContent=l.toUpperCase();document.querySelectorAll('[data-i18n]').forEach(el=>{if(TR[l][el.dataset.i18n])el.textContent=TR[l][el.dataset.i18n];});}
btn.addEventListener('click',()=>applyLang(lang==='de'?'en':'de'));
applyLang(lang);
