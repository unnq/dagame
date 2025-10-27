(() => {
  const { useState } = React;
  const CurrencyProvider = window.CurrencyProvider;

  const APPS = [
    { id: "tap",   name: "Tap Miner",  comp: () => <window.TapMiner /> },
    { id: "slots", name: "Slot Rush",  comp: () => <window.SlotRush /> },
    { id: "flip",  name: "Coin Flip+", comp: () => <window.CoinFlipPlus /> },
  ];

  function Header() {
    const icr = window.useIcr();
    return (
      <div className="header">
        <div className="brand">iCR • Arcade</div>
        <div className="kpi">Balance: {icr.get()} iCR</div>
      </div>
    );
  }

  // Mobile tabs (always rendered; CSS decides visibility)
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
          {APPS.map(a=>(
            <button key={a.id} className={current===a.id?'active':''} onClick={()=>onSelect(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  function App(){
    const [current, setCurrent] = useState("tap");
    const Active = APPS.find(a=>a.id===current).comp;
    return (
      <div className="app">
        <Header />
        <MobileTabs current={current} onSelect={setCurrent} />
        <div className="body">
          <Sidebar current={current} onSelect={setCurrent} />
          <main className="main">
            <div className="panel">
              <Active />
            </div>
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
})();
