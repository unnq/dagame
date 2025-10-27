(() => {
  const { useEffect, useState } = React;
  const useIcr = window.useIcr;
  const weightedPick = window.weightedPick;

  const LOOT_TABLE_TAP = [
    { rar: "gray",   p: 0.70, amount: 1 },
    { rar: "green",  p: 0.22, amount: 3 },
    { rar: "blue",   p: 0.06, amount: 8 },
    { rar: "purple", p: 0.017, amount: 20 },
    { rar: "gold",   p: 0.003, amount: 100 },
  ];
  const COOLDOWN_MS = 60_000;

  function RarityPill({ rar, children }) {
    const cls = { gray:"r-gray", green:"r-green", blue:"r-blue", purple:"r-purple", gold:"r-gold" }[rar] || "";
    return <span className={`pill ${cls}`}>{children}</span>;
  }

  function TapMiner(){
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
      setNextReadyAt(nra);
      localStorage.setItem("tap_next_ready", String(nra));
    };

    // --- DEV TOOLS ---
    const resetBalance = () => icr.set(0);
    const clearCooldown = () => {
      const nra = Date.now();
      setNextReadyAt(nra);
      localStorage.setItem("tap_next_ready", String(nra));
    };

    return (
      <div>
        <h2>Tap Miner</h2>
        <p className="muted">Press the button (60s cooldown). Earn iCR based on rarity.</p>

        <div className="row" style={{marginTop:8}}>
          <button className="btn primary" disabled={!ready} onClick={onTap}>
            {ready ? "Tap to Claim" : `Cooldown: ${secsLeft}s`}
          </button>
          {lastHit && <RarityPill rar={lastHit.rar}>{lastHit.rar.toUpperCase()} • +{lastHit.amount} iCR</RarityPill>}
        </div>

        <div className="sep"></div>

        <div className="row">
          <button className="btn" onClick={resetBalance}>Reset Balance (dev)</button>
          <button className="btn" onClick={clearCooldown}>Clear Cooldown (dev)</button>
        </div>
      </div>
    );
  }

  window.TapMiner = TapMiner;
})();
