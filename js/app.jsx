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
  { id: "tap",   name: "Tap Miner" },
  { id: "slots", name: "Slot Rush" },
  { id: "flip",  name: "Coin Flip+" },
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

// NEW: mobile-first tabs bar
  function MobileTabs({ current, onSelect }) {
    return (
      <nav className="tabs-mobile" role="tablist" aria-label="Games">
        {APPS.map(a => (
          <button
            key={a.id}
            role="tab"
            aria-selected={current === a.id}
            className={`tab ${current === a.id ? "active" : ""}`}
            onClick={() => onSelect(a.id)}
          >
            {a.name}
          </button>
        ))}
      </nav>
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
function RarityPill({ rar, children }) {
  const cls = { gray:"r-gray", green:"r-green", blue:"r-blue", purple:"r-purple", gold:"r-gold" }[rar] || "";
  return <span className={`pill ${cls}`}>{children}</span>;
}

/* =========================
   Tap Miner (60s faucet)
   ========================= */
const LOOT_TABLE_TAP = [
  { rar: "gray",   p: 0.70, amount: 5 },
  { rar: "green",  p: 0.22, amount: 15 },
  { rar: "blue",   p: 0.06, amount: 40 },
  { rar: "purple", p: 0.017, amount: 100 },
  { rar: "gold",   p: 0.003, amount: 1000 },
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
    </div>
  );
}

/* =========================
   Slot Rush (kept minimal)
   ========================= */
const SYMBOLS = {
  "1.2": { label:"⧈", faceClass:"face-gray",   rar:"gray"   },
  "1.5": { label:"◆",  faceClass:"face-green",  rar:"green"  },
  "2":   { label:"⬣",  faceClass:"face-blue",   rar:"blue"   },
  "5":   { label:"✦",  faceClass:"face-purple", rar:"purple" },
  "10":  { label:"✸",  faceClass:"face-gold",   rar:"gold"   },
  "30":  { label:"✪",  faceClass:"face-gold",   rar:"gold"   },
  "100": { label:"✺",  faceClass:"face-gold",   rar:"gold"   },
  "MISS":{ label:"•",  faceClass:"face-gray",   rar:"gray"   }
};
// you can swap this back to your 5× table if you prefer those bigger hits
const PROFILES = {
  safe: [
    [1.2, 0.26],[1.5, 0.14],[2, 0.085],[5, 0.027],[10, 0.007],[30, 0.002]
  ],
  mid:  [
    [1.2, 0.16],[1.5, 0.11],[2, 0.09],[5, 0.045],[10, 0.012],[30, 0.003]
  ],
  spicy:[
    [1.2, 0.08],[1.5, 0.06],[2, 0.07],[5, 0.035],[10, 0.020],[30, 0.007],[100,0.0005]
  ]
};
function pickOutcome(profile){
  const r = Math.random();
  let acc = 0; for (const [m,p] of profile){ acc += p; if (r <= acc) return m; }
  return "MISS";
}
function Reel({ face, spinKey }) {
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
  const [faces, setFaces] = useState([SYMBOLS["MISS"], SYMBOLS["MISS"], SYMBOLS["MISS"]]);
  const [last, setLast] = useState(null);
  const canSpin = !spinning && icr.get() >= bet && bet > 0;
  const onSpin = async () => {
    if (!canSpin) return;
    setSpinning(true); icr.spend(bet);
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
      <div className="row" style={{marginTop:8}}>
        <label className="pill kv">
          Bet
          <input type="number" min="1" step="1" value={bet}
            onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))} />
        </label>
        <select className="pill select" value={profile} onChange={e=>setProfile(e.target.value)}>
          <option value="safe">Safe</option>
          <option value="mid">Mid</option>
          <option value="spicy">Spicy</option>
        </select>
        <button className="btn primary" disabled={!canSpin} onClick={onSpin}>
          {spinning ? "Spinning…" : "Spin"}
        </button>
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
    </div>
  );
}

/* =========================
   Coin Flip+ (player-favorable)
   =========================
   - Default beta settings: 55% win chance, 2.0× payout (EV ≈ +10%)
   - Ladder mode: win → keep flipping to multiply pot, or cash out to bank.
*/
function CoinFlipPlus(){
  const icr = useIcr();

  // beta-tunable knobs (exposed in UI as well)
  const [winProb, setWinProb] = useState(0.55);   // 55% default (beta)
  const [payout,  setPayout ] = useState(2.0);    // 2.0x default
  const [bet,     setBet    ] = useState(20);
  const [side,    setSide   ] = useState("heads"); // future: aesthetic only
  const [spinning, setSpinning] = useState(false);

  // ladder state
  const [ladderActive, setLadderActive] = useState(false);
  const [pot, setPot] = useState(0);      // current ladder winnings (not yet banked)
  const [step, setStep] = useState(0);    // ladder depth
  const [lastMsg, setLastMsg] = useState(null);

  const canStart = !spinning && !ladderActive && bet>0 && icr.get() >= bet;
  const canCash  = ladderActive && !spinning;
  const canFlip  = ladderActive && !spinning;

  const rollWin = (p) => Math.random() < p;

  const startLadder = async () => {
    if (!canStart) return;
    setSpinning(true);
    icr.spend(bet); // stake initial bet
    await new Promise(r=>setTimeout(r, 400));
    const win = rollWin(winProb);
    if (win){
      const newPot = Math.floor(bet * payout);
      setPot(newPot);
      setStep(1);
      setLadderActive(true);
      setLastMsg(`WIN ×${payout.toFixed(2)} → pot ${newPot} iCR`);
    } else {
      setPot(0); setStep(0); setLadderActive(false);
      setLastMsg(`LOSS −${bet} iCR`);
    }
    setSpinning(false);
  };

  const flipAgain = async () => {
    if (!canFlip) return;
    setSpinning(true);
    await new Promise(r=>setTimeout(r, 400));
    const win = rollWin(winProb);
    if (win){
      const newPot = Math.floor(pot * payout);
      setPot(newPot);
      setStep(s => s+1);
      setLastMsg(`WIN ×${payout.toFixed(2)} → pot ${newPot} iCR`);
    } else {
      // lose the pot
      setLastMsg(`BUST at step ${step+1} — pot lost`);
      setPot(0); setStep(0); setLadderActive(false);
    }
    setSpinning(false);
  };

  const cashOut = () => {
    if (!canCash) return;
    icr.add(pot);
    setLastMsg(`CASHED OUT +${pot} iCR at step ${step}`);
    setPot(0); setStep(0); setLadderActive(false);
  };

  // quick EV display (single flip)
  const singleEV = (winProb * payout - 1) * 100; // percent of bet

  return (
    <div className="panel">
      <h2>Coin Flip+</h2>
      <p className="muted">
        Pick a side, place a bet, and flip. Default beta odds are generous (win {Math.round(winProb*100)}% @ {payout.toFixed(2)}×).
        After each win, either <b>Flip Again</b> to multiply your pot or <b>Cash Out</b> to bank it.
      </p>

      <div className="row" style={{marginTop:8}}>
        <div className="pill kv">
          Bet
          <input type="number" min="1" step="1" value={bet}
            onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))} />
        </div>

        <div className="pill choice">
          <button className={`btn ${side==='heads'?'primary':''}`} onClick={()=>setSide('heads')}>Heads</button>
          <button className={`btn ${side==='tails'?'primary':''}`} onClick={()=>setSide('tails')}>Tails</button>
        </div>

        <div className="pill kv">
          Win %
          <input type="number" min="30" max="70" step="1"
            value={Math.round(winProb*100)}
            onChange={e=>setWinProb(Math.min(0.7, Math.max(0.3, Number(e.target.value)/100)))} />
        </div>

        <div className="pill kv">
          Payout ×
          <input type="number" min="1.1" max="3" step="0.1"
            value={payout}
            onChange={e=>setPayout(Math.min(3, Math.max(1.1, Number(e.target.value||2))))} />
        </div>

        <span className="pill muted">EV/flip: <span className="big">{singleEV.toFixed(1)}%</span></span>
      </div>

      <div className="sep"></div>

      {!ladderActive ? (
        <div className="row">
          <button className="btn primary" disabled={!canStart} onClick={startLadder}>
            {spinning ? "Flipping…" : `Flip ${side[0].toUpperCase()+side.slice(1)}`}
          </button>
          {!canStart && <span className="muted">Need ≥ bet and no active ladder</span>}
        </div>
      ) : (
        <div className="row">
          <span className="pill r-gold">Pot: {pot} iCR</span>
          <span className="pill">Step: {step}</span>
          <button className="btn" onClick={cashOut} disabled={!canCash}>Cash Out</button>
          <button className="btn primary" onClick={flipAgain} disabled={!canFlip}>
            {spinning ? "Flipping…" : "Flip Again"}
          </button>
        </div>
      )}

      {lastMsg && <div className="list" style={{marginTop:10}}><div className="card">{lastMsg}</div></div>}
    </div>
  );
}

/* =========================
   App mount
   ========================= */
function App(){
  const [current, setCurrent] = useState("tap"); // start on Tap Miner
  return (
    <div className="app">
      <Header />
      <div className="body">
        <Sidebar current={current} onSelect={setCurrent} />
        <main className="main">
          {current === "tap"   && <TapMiner />}
          {current === "slots" && <SlotRush />}
          {current === "flip"  && <CoinFlipPlus />}
        </main>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CurrencyProvider>
    <App />
  </CurrencyProvider>
);
