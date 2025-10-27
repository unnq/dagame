(() => {
  const { useState } = React;
  const useIcr = window.useIcr;

  function CoinFlipPlus(){
    const icr = useIcr();

    // Beta-favorable defaults
    const [winProb, setWinProb] = useState(0.55); // 55% win chance
    const [payout,  setPayout ] = useState(2.0);  // 2.0× payout
    const [bet,     setBet    ] = useState(20);
    const [side,    setSide   ] = useState("heads");
    const [spinning, setSpinning] = useState(false);

    const [ladderActive, setLadderActive] = useState(false);
    const [pot, setPot]   = useState(0);
    const [step, setStep] = useState(0);
    const [lastMsg, setLastMsg] = useState(null);

    const canStart = !spinning && !ladderActive && bet>0 && icr.get() >= bet;
    const canCash  = ladderActive && !spinning;
    const canFlip  = ladderActive && !spinning;

    const rollWin = (p) => Math.random() < p;

    const startLadder = async () => {
      if (!canStart) return;
      setSpinning(true);
      icr.spend(bet);
      await new Promise(r=>setTimeout(r, 400));
      if (rollWin(winProb)) {
        const newPot = Math.floor(bet * payout);
        setPot(newPot); setStep(1); setLadderActive(true);
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
      if (rollWin(winProb)) {
        const newPot = Math.floor(pot * payout);
        setPot(newPot); setStep(s=>s+1);
        setLastMsg(`WIN ×${payout.toFixed(2)} → pot ${newPot} iCR`);
      } else {
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

    const singleEV = (winProb * payout - 1) * 100;

    return (
      <div className="panel">
        <h2>Coin Flip+</h2>
        <p className="muted">
          Flip with generous beta odds (win {Math.round(winProb*100)}% @ {payout.toFixed(2)}×).
          After each win, <b>Flip Again</b> to multiply your pot or <b>Cash Out</b>.
        </p>

        <div className="row" style={{marginTop:8}}>
          <label className="pill">
            Bet
            <input type="number" min="1" step="1" value={bet}
              onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))}
              style={{width:110, marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}}/>
          </label>

          <div className="pill">
            <button className={`btn ${side==='heads'?'primary':''}`} onClick={()=>setSide('heads')}>Heads</button>
            <button className={`btn ${side==='tails'?'primary':''}`} onClick={()=>setSide('tails')}>Tails</button>
          </div>

          <label className="pill">
            Win %
            <input type="number" min="30" max="70" step="1"
              value={Math.round(winProb*100)}
              onChange={e=>setWinProb(Math.min(0.7, Math.max(0.3, Number(e.target.value)/100)))}
              style={{width:80, marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}}/>
          </label>

          <label className="pill">
            Payout ×
            <input type="number" min="1.1" max="3" step="0.1"
              value={payout}
              onChange={e=>setPayout(Math.min(3, Math.max(1.1, Number(e.target.value||2))))}
              style={{width:80, marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}}/>
          </label>

          <span className="pill muted">EV/flip: {singleEV.toFixed(1)}%</span>
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

  window.CoinFlipPlus = CoinFlipPlus;
})();
