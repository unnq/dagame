(() => {
  const { useState } = React;
  const useIcr = window.useIcr;

  // Per-step multipliers applied to the CURRENT pot (not total vs bet)
  // Example with bet=20: step1 ×2 => 40; step2 ×3.5 => 140; step3 ×2 => 280, etc.
  const STEP_FACTORS = [2.0, 2.5, 3.0, 5.0]; // tweak as you like

  const BASE_WIN = 0.55;   // first flip win chance = 55%
  const STEP_DROP = 0.05;  // -5% absolute per successful step
  const MIN_WIN  = 0.05;   // floor if you extend many steps

  // Win probability for the NEXT flip, given how many wins (steps) you already have
  function nextWinProb(currentStep) {
    return Math.max(MIN_WIN, BASE_WIN - STEP_DROP * currentStep);
  }

  function CoinFlipPlus(){
    const icr = useIcr();

    const [bet,     setBet    ] = useState(20);
    const [side,    setSide   ] = useState("heads");
    const [spinning, setSpinning] = useState(false);

    // Ladder state (step = number of successful flips so far)
    const [ladderActive, setLadderActive] = useState(false);
    const [pot, setPot]   = useState(0);  // current pot (not yet banked)
    const [step, setStep] = useState(0);  // successful steps so far
    const [lastMsg, setLastMsg] = useState(null);

    const canStart = !spinning && !ladderActive && bet>0 && icr.get() >= bet;
    const canCash  = ladderActive && !spinning;
    const canFlip  = ladderActive && !spinning && step < STEP_FACTORS.length;

    const rollWin = (p) => Math.random() < p;

    // Start a new ladder
    const startLadder = async () => {
      if (!canStart) return;
      setSpinning(true);
      icr.spend(bet);

      const pWin = nextWinProb(0);           // 55%
      const factor = STEP_FACTORS[0];        // e.g. ×2.0

      await new Promise(r=>setTimeout(r, 400));
      if (rollWin(pWin)) {
        const newPot = Math.floor(bet * factor); // apply to initial bet
        setPot(newPot);
        setStep(1);
        setLadderActive(true);
        const totalMult = (newPot / bet).toFixed(2);
        setLastMsg(`WIN (${Math.round(pWin*100)}% • ×${factor.toFixed(2)} on pot) → total ×${totalMult} • pot ${newPot} iCR`);
      } else {
        setPot(0); setStep(0); setLadderActive(false);
        setLastMsg(`LOSS −${bet} iCR`);
      }
      setSpinning(false);
    };

    // Continue the ladder
    const flipAgain = async () => {
      if (!canFlip) return;
      setSpinning(true);

      const pWin = nextWinProb(step);             // drops 5% per existing success
      const factor = STEP_FACTORS[step];          // next step factor (applied to CURRENT pot)

      await new Promise(r=>setTimeout(r, 400));
      if (rollWin(pWin)) {
        const newPot = Math.floor(pot * factor);
        const totalMult = (newPot / bet).toFixed(2);
        setPot(newPot);
        setStep(s => s + 1);
        setLastMsg(`WIN (${Math.round(pWin*100)}% • ×${factor.toFixed(2)} on pot) → total ×${totalMult} • pot ${newPot} iCR`);
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

    // UI helpers
    const nextFactor = ladderActive ? (STEP_FACTORS[step] ?? null) : STEP_FACTORS[0];
    const nextProb   = ladderActive ? nextWinProb(step) : nextWinProb(0);
    const cumMult    = ladderActive ? (pot / bet) : 1;
    const totalIfWin = nextFactor ? (ladderActive ? (pot * nextFactor) : (bet * nextFactor)) : null;
    const totalIfWinMult = totalIfWin ? (totalIfWin / bet).toFixed(2) : null;

    return (
      <div className="panel">
        <h2>Coin Flip+</h2>
        <p className="muted">
          Each successful flip multiplies your <b>current pot</b> by a bigger factor but reduces win chance by <b>5%</b>.
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

          {/* Read-only info pills */}
          <span className="pill">
            Current total: ×{cumMult.toFixed(2)}
          </span>
          {nextFactor && (
            <span className="pill">
              Next flip: {Math.round(nextProb*100)}% • ×{nextFactor.toFixed(2)} on pot
              {totalIfWinMult && <> → total ×{totalIfWinMult}</>}
            </span>
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
              {spinning ? "Flipping…" : `Flip Again (${Math.round(nextProb*100)}% • ×${nextFactor?.toFixed(2)})`}
            </button>
          </div>
        )}

        {lastMsg && <div className="list" style={{marginTop:10}}><div className="card">{lastMsg}</div></div>}
      </div>
    );
  }

  window.CoinFlipPlus = CoinFlipPlus;
})();
