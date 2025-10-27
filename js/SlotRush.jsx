(() => {
  const { useState } = React;
  const useIcr = window.useIcr;

  // Symbols MUST cover every multiplier used in PROFILES
  const SYMBOLS = {
    "2":   { label:"⬣", faceClass:"face-blue",   rar:"blue"   },
    "8":   { label:"✦", faceClass:"face-purple", rar:"purple" },
    "15":  { label:"✸", faceClass:"face-gold",   rar:"gold"   },
    "25":  { label:"✺", faceClass:"face-gold",   rar:"gold"   },
    "75":  { label:"✪", faceClass:"face-gold",   rar:"gold"   },
    "MISS":{ label:"•",  faceClass:"face-gray",   rar:"gray"   }
  };

  // Your edited distribution
  const PROFILES = {
    ladder: [
      [2,   0.15125],
      [8,   0.075],
      [15,  0.04],
      [25,  0.015],
      [75,  0.015], // include 75 since you defined it in SYMBOLS
      // MISS = 1 - sum above
    ]
  };

  function pickOutcome(profile){
    const r = Math.random();
    let acc = 0;
    for (const [m,p] of profile){ acc += p; if (r <= acc) return m; }
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

  function RarityPill({ rar, children }) {
    const cls = { gray:"r-gray", green:"r-green", blue:"r-blue", purple:"r-purple", gold:"r-gold" }[rar] || "";
    return <span className={`pill ${cls}`}>{children}</span>;
  }

  function SlotRush(){
    const icr = useIcr();
    const table = PROFILES.ladder;

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
        const face = SYMBOLS[String(m)] || SYMBOLS["MISS"]; // guard
        setFaces([face, face, face]);
        setLast({ multiplier: Number(m), payout, miss:false });
      } else {
        // update pool to only include keys that exist
        const poolKeys = ["2","8","15","25"]; // leave out the top jackpot if you want
        const rnd = () => SYMBOLS[poolKeys[Math.floor(Math.random()*poolKeys.length)]] || SYMBOLS["MISS"];
        setFaces([rnd(), rnd(), rnd()]);
        setLast({ multiplier: 0, payout: 0, miss:true });
      }
      setSpinning(false);
    };

    const paidPct = table.reduce((a,[,p])=>a + p*100, 0);
    const missPct = (100 - paidPct).toFixed(2);

    return (
      <div>
        <h2>Slot Rush</h2>
        <p className="muted">Now with updated payouts.</p>

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
          {table.map(([m,p],i)=>{
            const sym = SYMBOLS[String(m)] || SYMBOLS["MISS"]; // guard
            return (
              <div key={i} className="card row">
                <RarityPill rar={sym.rar}>{m}×</RarityPill>
                <span className="muted" style={{marginLeft:"auto"}}>{(p*100).toFixed(2)}%</span>
              </div>
            );
          })}
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
