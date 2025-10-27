(() => {
  // Weighted picker for tables like [{p: 0.7, ...}, {p: 0.2, ...}]
  function weightedPick(table, rnd = Math.random) {
    const r = rnd(); let acc = 0;
    for (const row of table) { acc += row.p; if (r <= acc) return row; }
    return table[table.length - 1];
  }

  // Expose
  window.weightedPick = weightedPick;
})();
