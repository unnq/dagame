const { useState, useEffect, useMemo, useCallback, createContext, useContext } = React;

/** ------------------------------
 *  Currency context (shared iCR)
 *  ------------------------------ */
const CurrencyCtx = createContext(null);

function CurrencyProvider({ children }) {
  const [icr, setIcr] = useState(() => {
    const v = localStorage.getItem("icr_balance");
    return v ? parseInt(v, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem("icr_balance", String(icr));
  }, [icr]);

  const api = useMemo(() => ({
    get: () => icr,
    add: (amt) => setIcr(x => Math.max(0, x + amt)),
    set: (amt) => setIcr(Math.max(0, amt)),
  }), [icr]);

  return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
}
function useIcr(){ return useContext(CurrencyCtx); }

/** ------------------------------
 *  Simple OS-like shell
 *  ------------------------------ */
const APPS = [
  { id: "tap", name: "Tap Miner" },
  // future: { id: "dice", name: "Dice Ladder" }, ...
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
          <button
            key={app.id}
            className={current === app.id ? "active" : ""}
            onClick={() => onSelect(app.id)}
          >
            {app.name}
          </button>
        ))}
      </div>
    </aside>
  );
}

/** ------------------------------
 *  Loot table + utility
 *  ------------------------------ */
const LOOT_TABLE = [
  { rar: "gray",   p: 0.70, amount: 1 },
  { rar: "green",  p: 0.22, amount: 3 },
  { rar: "blue",   p: 0.06, amount: 8 },
  { rar: "purple", p: 0.017, amount: 20 },
  { rar: "gold",   p: 0.003, amount: 100 },
];

function weightedPick(table) {
  const r = Math.random();
  let acc = 0;
  for (const row of table) {
    acc += row.p;
    if (r <= acc) return row;
  }
  return table[table.length - 1];
}

function RarityPill({ rar, children }) {
  const cls = {
    gray: "r-gray",
    green: "r-green",
    blue: "r-blue",
    purple: "r-purple",
    gold: "r-gold",
  }[rar] || "";
  return <span className={`pill ${cls}`}>{children}</span>;
}

/** ------------------------------
 *  Tap Miner (60s cooldown faucet)
 *  ------------------------------ */
const COOLDOWN_MS = 60_000;

function TapMiner() {
  const icr = useIcr();

  // Persist only the next-ready time during beta so refresh doesn't bypass cooldown
  const [nextReadyAt, setNextReadyAt] = useState(() => {
    const v = localStorage.getItem("tap_next_ready");
    return v ? parseInt(v, 10) : 0;
  });
  const [now, setNow] = useState(Date.now());
  const [lastHit, setLastHit] = useState(null); // {rar, amount, at}

  // Tick each second for countdown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ready = now >= nextReadyAt;
  const secsLeft = Math.max(0, Math.ceil((nextReadyAt - now) / 1000));

  const onTap = useCallback(() => {
    if (!ready) return;
    const roll = weightedPick(LOOT_TABLE);
    icr.add(roll.amount);
    const hit = { rar: roll.rar, amount: roll.amount, at: Date.now() };
    setLastHit(hit);
    const nra = Date.now() + COOLDOWN_MS;
    setNextReadyAt(nra);
    localStorage.setItem("tap_next_ready", String(nra));
  }, [ready, icr]);

  return (
    <div className="panel">
      <h2>Tap Miner</h2>
      <p className="muted">Press the button (60s cooldown). Earn iCR based on rarity.</p>
      <div className="row" style={{marginTop: 8}}>
        <button className="btn primary" disabled={!ready} onClick={onTap}>
          {ready ? "Tap to Claim" : `Cooldown: ${secsLeft}s`}
        </button>
        {lastHit && (
          <RarityPill rar={lastHit.rar}>
            {lastHit.rar.toUpperCase()} • +{lastHit.amount} iCR
          </RarityPill>
        )}
      </div>

      <div className="sep"></div>

      <div>
        <div className="muted">Loot Table (prototype)</div>
        <div className="list">
          {LOOT_TABLE.map((row, idx) => (
            <div key={idx} className="card row">
              <RarityPill rar={row.rar}>{row.rar.toUpperCase()}</RarityPill>
              <span>→ +{row.amount} iCR</span>
              <span className="muted" style={{marginLeft:"auto"}}>{(row.p*100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sep"></div>

      <div className="row">
        <button className="btn" onClick={() => { // dev helper
          const newBal = 0;
          icr.set(newBal);
          setLastHit(null);
        }}>
          Reset Balance (dev)
        </button>
        <button className="btn" onClick={() => {
          const nra = Date.now();
          setNextReadyAt(nra);
          localStorage.setItem("tap_next_ready", String(nra));
        }}>
          Clear Cooldown (dev)
        </button>
      </div>
    </div>
  );
}

/** ------------------------------
 *  App
 *  ------------------------------ */
function App(){
  const [current, setCurrent] = useState("tap");
  return (
    <div className="app">
      <Header />
      <div className="body">
        <Sidebar current={current} onSelect={setCurrent} />
        <main className="main">
          {current === "tap" && <TapMiner />}
          {/* future: {current === "dice" && <DiceGame />} ... */}
        </main>
      </div>
    </div>
  );
}

/** ------------------------------
 *  Mount
 *  ------------------------------ */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CurrencyProvider>
    <App />
  </CurrencyProvider>
);
