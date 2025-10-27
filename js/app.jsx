const { useState, useEffect, useMemo, useCallback, createContext, useContext } = React;

/* =========================
   Currency (iCR) Context
   ========================= */
const CurrencyCtx = createContext(null);
function CurrencyProvider({ children }) {
  const [icr, setIcr] = useState(() => {
    const v = localStorage.getItem("icr_balance");
    return v ? parseInt(v, 10) : 0;
  });
  useEffect(() => localStorage.setItem("icr_balance", String(icr)), [icr]);
  const api = useMemo(() => ({
    get: () => icr,
    add: (amt) => setIcr(x => Math.max(0, x + amt)),
    set: (amt) => setIcr(Math.max(0, amt)),
    spend: (amt) => setIcr(x => Math.max(0, x - amt)),
  }), [icr]);
  return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
}
function useIcr(){ return useContext(CurrencyCtx); }

/* =========================
   Shell
   ========================= */
const APPS = [
  { id: "tap", name: "Tap Miner" },
  { id: "slots", name: "Slot Rush" },
];

function Header() {
  const icr = useIcr();
  return (
    <div className="header">
      <div className="brand">iCR • Arcade</div>
      <div className="kpi">Balance: {icr.get()} iCR</div>
    </div>
  );
}
function Sidebar({ current, onSelect }) {
  return (
    <aside className="sidebar">
      <h4>apps</h4>
      <div className="nav">
        {APPS.map(app => (
          <button key={app.id} className={current === app.id ? "active" : ""} onClick={() => onSelect(app.id)}>
            {app.name}
          </button>
        ))}
      </div>
    </aside>
  );
}

/* =========================
   Rarity helpers (shared)
   ========================= */
function RarityPill({ rar, children }) {
  const cls = { gray:"r-gray", green:"r-green", blue:"r-blue", purple:"r-purple", gold:"r-gold" }[rar] || "";
  return <span className={`pill ${cls}`}>{children}</span>;
}

/* =========================
   Tap Miner (from before)
   ========================= */
const LOOT_TABLE_TAP = [
  { rar: "gray",   p: 0.70, amount: 1 },
  { rar: "green",  p: 0.22, amount: 3 },
  { rar: "blue",   p: 0.06, amount: 8 },
  { rar: "purple", p: 0.017, amount: 20 },
  { rar: "gold",   p: 0.003, amount: 100 },
];
const COOLDOWN_MS = 60_000;
function weightedPick(table) {
  const r = Math.random(); let acc = 0;
  for (const row of table) { acc += row.p; if (r <= acc) return row; }
  return table[table.length - 1];
}
function TapMiner() {
  const icr = useIcr();
  const [nextReadyAt, setNextReadyAt] = useState(() => parseInt(localStorage.getItem("tap_next_ready")||"0",10));
  const [now, setNow] = useState(Date.now());
  const [lastHit, setLastHit] = useState(null);
  useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(id);},[]);
  const ready = now >= nextReadyAt;
  const secsLeft = Math.max(0, Math.ceil((nextReadyAt - now)/1000));
  const onTap = () => {
    if (!ready) return;
    const roll = weightedPick(LOOT_TABLE_TAP);
    icr.add(roll.amount);
    setLastHit({ rar: roll.rar, amount: roll.amount });
    const nra = Date.now()+COOLDOWN_MS;
    setNextReadyAt(nra); localStorage.setItem("tap_next_ready", String(nra));
  };
  return (
    <div className="panel">
      <h2>Tap Miner</h2>
      <p className="muted">Press the button (60s cooldown). Earn iCR based on rarity.</p>
      <div className="row" style={{marginTop:8}}>
        <button className="btn primary" disabled={!ready} onClick={onTap}>
          {ready ? "Tap to Claim" : `Cooldown: ${secsLeft}s`}
        </button>
        {lastHit && <RarityPill rar={lastHit.rar}>{lastHit.rar.toUpperCase()} • +{lastHit.amount} iCR</RarityPill>}
      </div>
      <div className="sep"></div>
      <div className="muted">Loot Table</div>
      <div className="list">
        {LOOT_TABLE_TAP.map((r,i)=>(
          <div key={i} className="card row">
            <RarityPill rar={r.rar}>{r.rar.toUpperCase()}</RarityPill>
            <span>→ +{r.amount} iCR</span>
            <span className="muted" style={{marginLeft:"auto"}}>{(r.p*100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="sep"></div>
      <div className="row">
        <button className="btn" onClick={()=>icr.set(0)}>Reset Balance (dev)</button>
        <button className="btn" onClick={()=>{const n=Date.now();setNextReadyAt(n);localStorage.setItem("tap_next_ready",String(n));}}>
          Clear Cooldown (dev)
        </button>
      </div>
    </div>
  );
}

/* =========================
   Slot Rush — 3-reel, 1-line
   =========================
   We pick outcomes from a tuned table (RTP ~95–97%) for each profile,
   then map to symbols so wins look like 3-of-a-kind.
*/
const SYMBOLS = {
  "1.2": { label:"⧈", faceClass:"face-gray", rar:"gray"   }, // chip
  "1.5": { label:"◆",  faceClass:"face-green", rar:"green" }, // gem
  "2":   { label:"⬣", faceClass:"face-blue",  rar:"blue"  }, // prism
  "5":   { label:"✦",  faceClass:"face-purple",rar:"purple"}, // star
  "10":  { label:"✸",  faceClass:"face-gold",  rar:"gold"  }, // burst
  "30":  { label:"✪",  faceClass:"face-gold",  rar:"gold"  },
  "100": { label:"✺",  faceClass:"face-gold",  rar:"gold"  },
  "MISS":{ label:"•",  faceClass:"face-gray",  rar:"gray"  }
};
// Outcome tables: [multiplier, probability]
const PROFILES = {
  safe: [
    [1.2, 0.26],[1.5, 0.14],[2, 0.085],[5, 0.027],[10, 0.007],[30, 0.002] // EV≈0.957
    // miss prob = 1 - sum = 0.479
  ],
  mid:  [
    [1.2, 0.16],[1.5, 0.11],[2, 0.09],[5, 0.045],[10, 0.012],[30, 0.003] // EV≈0.972
    // miss ≈ 0.579
  ],
  spicy:[
    [1.2, 0.08],[1.5, 0.06],[2, 0.07],[5, 0.035],[10, 0.020],[30, 0.007],[100,0.0005] // EV≈0.961
    // miss ≈ 0.7275
  ]
};
function pickOutcome(profile){
  const pSum = profile.reduce((a,[,p])=>a+p,0);
  const r = Math.random();
  let acc = 0;
  for (const [m,p] of profile){
    acc += p; if (r <= acc) return m;
  }
  return "MISS"; // remaining probability mass
}

function Reel({ face, spinKey }) {
  // simple “spin”: bump translateY so it feels like movement
  return (
    <div className="reel">
      <div className={`reel-face ${face.faceClass}`} style={{ transform:`translateY(${spinKey ? 0 : 12}px)` }}>
        {face.label}
      </div>
    </div>
  );
}

function SlotRush(){
  const icr = useIcr();
  const [profile, setProfile] = useState("safe");
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [faces, setFaces] = useState([
    SYMBOLS["MISS"], SYMBOLS["MISS"], SYMBOLS["MISS"]
  ]);
  const [last, setLast] = useState(null); // {multiplier, payout, miss}

  const canSpin = !spinning && icr.get() >= bet && bet > 0;

  const onSpin = async () => {
    if (!canSpin) return;
    setSpinning(true);
    icr.spend(bet);

    // fake spin animation delay
    await new Promise(r=>setTimeout(r, 350));

    const m = pickOutcome(PROFILES[profile]);
    let payout = 0;

    if (m !== "MISS") {
      payout = Math.floor(bet * Number(m));
      icr.add(payout);
      const face = SYMBOLS[String(m)];
      setFaces([face, face, face]);
      setLast({ multiplier: Number(m), payout, miss:false });
    } else {
      // show mismatched faces
      const pool = [SYMBOLS["1.2"],SYMBOLS["1.5"],SYMBOLS["2"],SYMBOLS["5"],SYMBOLS["MISS"]];
      const rndFace = () => pool[Math.floor(Math.random()*pool.length)];
      setFaces([rndFace(), rndFace(), rndFace()]);
      setLast({ multiplier: 0, payout: 0, miss:true });
    }

    setSpinning(false);
  };

  const profileTable = PROFILES[profile];

  return (
    <div className="panel">
      <h2>Slot Rush</h2>
      <p className="muted">3-reel, 1-line visual. Outcomes are drawn from a tuned table (RTP target ~95–97%).</p>

      <div className="row" style={{marginTop:8}}>
        <label className="pill">
          Bet
          <input type="number" min="1" step="1" value={bet}
            onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))}
            style={{width:90,marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}} />
        </label>
        <select className="pill" value={profile} onChange={e=>setProfile(e.target.value)}
          style={{background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)"}}>
          <option value="safe">Safe (steady)</option>
          <option value="mid">Mid (balanced)</option>
          <option value="spicy">Spicy (swingy)</option>
        </select>
        <button className="btn primary" disabled={!canSpin} onClick={onSpin}>
          {spinning ? "Spinning…" : "Spin"}
        </button>
        {!canSpin && <span className="muted">Need ≥ bet and not spinning</span>}
      </div>

      <div className="payline"></div>
      <div className="slot-wrap">
        <Reel face={faces[0]} spinKey={spinning}/>
        <Reel face={faces[1]} spinKey={spinning}/>
        <Reel face={faces[2]} spinKey={spinning}/>
      </div>

      {last && (
        <div className="row" style={{marginTop:8}}>
          {last.miss
            ? <span className="pill r-gray">MISS • −{bet} iCR</span>
            : <span className="pill r-gold">WIN ×{last.multiplier} • +{last.payout - bet} iCR (net)</span>}
        </div>
      )}

      <div className="sep"></div>
      <div className="muted">Profile odds (per spin)</div>
      <div className="list">
        {profileTable.map(([m,p],i)=>(
          <div key={i} className="card row">
            <RarityPill rar={SYMBOLS[String(m)].rar}>
              {m}×
            </RarityPill>
            <span className="muted" style={{marginLeft:"auto"}}>{(p
