(() => {
  const { createContext, useContext, useMemo, useEffect, useState } = React;

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
      spend: (amt) => setIcr(x => Math.max(0, x - amt)),
    }), [icr]);

    return <CurrencyCtx.Provider value={api}>{children}</CurrencyCtx.Provider>;
  }

  function useIcr(){ return useContext(CurrencyCtx); }

  // expose globally
  window.CurrencyProvider = CurrencyProvider;
  window.useIcr = useIcr;
})();
