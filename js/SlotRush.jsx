(() => {
  const { useState } = React;
  const useIcr = window.useIcr;

  // Minimal symbol set matching the ladder payouts
  const SYMBOLS = {
    "2":    { label:"⬣", faceClass:"face-blue",   rar:"blue"   },
    "8":    { label:"✦", faceClass:"face-purple", rar:"purple" },
    "15":   { label:"✸", faceClass:"face-gold",   rar:"gold"   },
    "75": { label:"✪", faceClass:"face-gold",   rar:"gold"   },
    "MISS": { label:"•",  faceClass:"face-gray",   rar:"gray"   }
  };

  // Profile that mirrors Coin Flip+ ladder outcomes with STEP_FACTORS [2, 2.5, 3, 2.5]
  // and odds 55% → 50% → 45% → 40%.
  //
  // Result distribution if you "auto-cash" right before bust:
  //  - 0x  : 0.45
  //  - 2x  : 0.55 * 0.50^0 * 0.50 = 0.275
  //  - 5x  : 0.55 * 0.50 * 0.45 = 0.15125
  //  - 15x : 0.55 * 0.50 * 0.45 * 0.40 = 0.0495, but that's "win all three then lose" in the 4-step version.
  //  - 37.5x (jackpot) : 0.55 * 0.50 * 0.45 * 0.40 = 0.0495 (≈ 4.95%)
  //
  // For the slot, we expose the four paying outcomes explicitly; MISS is the remainder.
  const PROFILES = {
    ladder: [
      [2,      0.15125  ],
      [8,      0.075 ],
      [25,     0.04 ],
      [75,   0.015 ],
      // implicit MISS prob = 1 - sum = 0.45
    ]
  };

  function pickOutcome(profile){
    const r = Math.random();
    let acc = 0;
    for (const [m,p] of profile){ acc += p; if (r <= acc) return m; }
    return "MISS"; // remaining mass goes to miss
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

  function RarityPill({ rar, children }) {
    const cls = { gray:"r-gray", green:"r-green", blue:"r-blue", purple:"r-purple", gold:"r-gold" }[rar] || "";
    return <span className={`pill ${cls}`}>{children}</span>;
  }

  function SlotRush(){
    const icr = useIcr();

    // fixed to ladder-mimic; no dropdown needed
    const profileKey = "ladder";
    const table = PROFILES[profileKey];

    const [bet, setBet] = useState(20);
    const [spinning, setSpinning] = useState(false);
    const [faces, setFaces] = useState([SYMBOLS["MISS"], SYMBOLS["MISS"], SYMBOLS["MISS"]]);
    const [last, setLast] = useState(null);

    const canSpin = !spinning && icr.get() >= bet && bet > 0;

    const onSpin = async () => {
      if (!canSpin) return;
      setSpinning(true);
      icr.spend(bet);

      await new Promise(r=>setTimeout(r, 350));

      const m = pickOutcome(table);
      if (m !== "MISS") {
        const payout = Math.floor(bet * Number(m));
        icr.add(payout);
        const face = SYMBOLS[String(m)];
        setFaces([face, face, face]);
        setLast({ multiplier: Number(m), payout, miss:false });
      } else {
        // show mismatched faces on a miss
        const pool = [SYMBOLS["2"], SYMBOLS["5"], SYMBOLS["15"], SYMBOLS["MISS"]];
        const rnd = () => pool[Math.floor(Math.random()*pool.length)];
        setFaces([rnd(), rnd(), rnd()]);
        setLast({ multiplier: 0, payout: 0, miss:true });
      }
      setSpinning(false);
    };

    const missPct = (100 - table.reduce((a,[,p])=>a + p*100, 0)).toFixed(2);

    return (
      <div>
        <h2>Slot Rush</h2>
        <p className="muted">Payouts mirror Coin Flip+ ladder: 2×, 5×, 15×, 37.5× with matching probabilities.</p>

        <div className="row" style={{marginTop:8}}>
          <label className="pill">
            Bet
            <input
              type="number" min="1" step="1" value={bet}
              onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))}
              style={{width:90, marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}}
            />
          </label>

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

        <div className="sep"></div>
        <div className="muted">Odds</div>
        <div className="list">
          {table.map(([m,p],i)=>(
            <div key={i} className="card row">
              <RarityPill rar={SYMBOLS[String(m)].rar}>{m}×</RarityPill>
              <span className="muted" style={{marginLeft:"auto"}}>{(p*100).toFixed(2)}%</span>
            </div>
          ))}
          <div className="card row">
            <span className="pill r-gray">MISS</span>
            <span className="muted" style={{marginLeft:"auto"}}>{missPct}%</span>
          </div>
        </div>
      </div>
    );
  }

  window.SlotRush = SlotRush;
})();
