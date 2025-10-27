(() => {
  const { useState } = React;
  const useIcr = window.useIcr;

  // Ladder schedule: total multipliers vs original bet
  const LADDER_TOTALS = [2.0, 3.5, 5.0, 7.5, 10.0]; // you can tweak or extend
  const BASE_WIN = 0.55; // 55% first flip
  const STEP_DROP = 0.05; // -5% absolute per step
  const MIN_WIN = 0.05; // floor so it never goes below 5% if extended

  // Helper: win probability for the NEXT flip given current successful steps
  function nextWinProb(currentStep) {
    // currentStep = how many wins you've banked in the ladder (0 before first win)
    const p = BASE_WIN - STEP_DROP * currentStep;
    return Math.max(MIN_WIN, p);
  }

  // Helper: total multiplier for a given successful step index
  function totalMultForStep(stepIndex) {
    return LADDER_TOTALS[Math.min(stepIndex, LADDER_TOTALS.length - 1)];
  }

  function CoinFlipPlus(){
    const icr = useIcr();

    const [bet,     setBet    ] = useState(20);
    const [side,    setSide   ] = useState("heads");
    const [spinning, setSpinning] = useState(false);

    // Ladder state
    // step = number of successful flips so far in this ladder (0 before first win)
    const [ladderActive, setLadderActive] = useState(false);
    const [pot, setPot]   = useState(0);  // current pot (not yet banked)
    const [step, setStep] = useState(0);  // successful steps so far
    const [lastMsg, setLastMsg] = useState(null);

    const canStart = !spinning && !ladderActive && bet>0 && icr.get() >= bet;
    const canCash  = ladderActive && !spinning;
    const canFlip  = ladderActive && !spinning && step < LADDER_TOTALS.length; // disable beyond last defined step

    const rollWin = (p) => Math.random() < p;

    // First flip in a new ladder
    const startLadder = async () => {
      if (!canStart) return;
      setSpinning(true);
      icr.spend(bet);
      // Odds & target for this first flip
      const pWin = nextWinProb(0);             // 55%
      const tgt  = totalMultForStep(0);        // 2.00× total

      await new Promise(r=>setTimeout(r, 400));
      if (rollWin(pWin)) {
        const newPot = Math.floor(bet * tgt);
        setPot(newPot);
        setStep(1);               // one successful step now
        setLadderActive(true);
        setLastMsg(`WIN (${Math.round(pWin*100)}% → total ×${tgt.toFixed(2)}) • pot ${newPot} iCR`);
      } else {
        setPot(0); setStep(0); setLadderActive(false);
        setLastMsg(`LOSS −${bet} iCR`);
      }
      setSpinning(false);
    };

    // Flip again within ladder
    const flipAgain = async () => {
      if (!canFlip) return;
      setSpinning(true);

      // Odds & target for the NEXT successful step we’re attempting
      const pWin = nextWinProb(step);                 // drops 5% per existing step
      const tgt  = totalMultForStep(step);            // total multiplier if we win this step

      await new Promise(r=>setTimeout(r, 400));
      if (rollWin(pWin)) {
        const newPot = Math.floor(bet * tgt);         // total vs original bet
        setPot(newPot);
        setStep(s => s + 1);
        setLastMsg(`WIN (${Math.round(pWin*100)}% → total ×${tgt.toFixed(2)}) • pot ${newPot} iCR`);
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

    // Info for UI: current and next targets
    const thisFlipProb = nextWinProb(0);                    // 55% (for the very first flip)
    const thisFlipMult = totalMultForStep(0);               // 2.00×
    const nextProb     = ladderActive ? nextWinProb(step) : nextWinProb(0);
    const nextMult     = ladderActive ? totalMultForStep(step) : totalMultForStep(0);

    return (
      <div className="panel">
        <h2>Coin Flip+</h2>
        <p className="muted">
          Each successful flip increases your <b>total multiplier</b> but reduces win chance by <b>5%</b>.
          Example: 55% → <b>2.00×</b>, then 50% → <b>3.50×</b>, then 45% → <b>5.00×</b>, etc.
        </p>

        <div className="row" style={{marginTop:8}}>
          <label className="pill">
            Bet
            <input
              type="number" min="1" step="1" value={bet}
              onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))}
              style={{width:110, marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}}
            />
          </label>

          <div className="pill">
            <button className={`btn ${side==='heads'?'primary':''}`} onClick={()=>setSide('heads')}>Heads</button>
            <button className={`btn ${side==='tails'?'primary':''}`} onClick={()=>setSide('tails')}>Tails</button>
          </div>

          {/* Read-only info pills instead of editable odds/payout */}
          <span className="pill">This flip: {Math.round(thisFlipProb*100)}% → ×{thisFlipMult.toFixed(2)} total</span>
          {ladderActive && (
            <span className="pill">Next flip: {Math.round(nextProb*100)}% → ×{nextMult.toFixed(2)} total</span>
          )}
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
              {spinning ? "Flipping…" : `Flip Again (${Math.round(nextProb*100)}% → ×${nextMult.toFixed(2)})`}
            </button>
          </div>
        )}

        {lastMsg && <div className="list" style={{marginTop:10}}><div className="card">{lastMsg}</div></div>}
      </div>
    );
  }

  window.CoinFlipPlus = CoinFlipPlus;
})();
