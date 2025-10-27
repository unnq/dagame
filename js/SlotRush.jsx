(() => {
  const { useState } = React;
  const useIcr = window.useIcr;

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

  // You can swap to the “5× punchier” version later
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
    const r = Math.random(); let acc = 0;
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
      if (m !== "MISS") {
        const payout = Math.floor(bet * Number(m));
        icr.add(payout);
        const face = SYMBOLS[String(m)];
        setFaces([face, face, face]);
        setLast({ multiplier: Number(m), payout, miss:false });
      } else {
        const pool = [SYMBOLS["1.2"],SYMBOLS["1.5"],SYMBOLS["2"],SYMBOLS["5"],SYMBOLS["MISS"]];
        const rnd = () => pool[Math.floor(Math.random()*pool.length)];
        setFaces([rnd(), rnd(), rnd()]);
        setLast({ multiplier: 0, payout: 0, miss:true });
      }
      setSpinning(false);
    };

    const table = PROFILES[profile];

    return (
      <div className="panel">
        <h2>Slot Rush</h2>
        <div className="row" style={{marginTop:8}}>
          <label className="pill">
            Bet
            <input type="number" min="1" step="1" value={bet}
              onChange={e=>setBet(Math.max(1, Number(e.target.value||1)))}
              style={{width:90, marginLeft:6, background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)", borderRadius:"8px", padding:"4px 6px"}}/>
          </label>
          <select className="pill" value={profile} onChange={e=>setProfile(e.target.value)}
            style={{background:"#0a0e13", color:"var(--text)", border:"1px solid var(--line)"}}>
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

        <div className="sep"></div>
        <div className="muted">Profile odds</div>
        <div className="list">
          {table.map(([m,p],i)=>(
            <div key={i} className="card row">
              <RarityPill rar={SYMBOLS[String(m)].rar}>{m}×</RarityPill>
              <span className="muted" style={{marginLeft:"auto"}}>{(p*100).toFixed(2)}%</span>
            </div>
          ))}
          <div className="card row">
            <span className="pill r-gray">MISS</span>
            <span className="muted" style={{marginLeft:"auto"}}>
              {( (1 - table.reduce((a,[,p])=>a+p,0)) * 100 ).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  window.SlotRush = SlotRush;
})();
