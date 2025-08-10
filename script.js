const CTR_CURVE = {
  1: 0.30,
  2: 0.15,
  3: 0.10,
  4: 0.07,
  5: 0.05,
  6: 0.04,
  7: 0.03,
  8: 0.02,
  9: 0.015,
 10: 0.01
};

function extractCocon(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/g, '').replace(/\/+$/g, '');
    if (!path) return u.hostname;
    return path.split('/')[0];
  } catch (e) {
    return 'unknown';
  }
}

function estimate(data, improvement, multiplier) {
  const results = {};
  data.forEach(row => {
    const sv = Number(row['Search Volume']) || 0;
    const pos = Number(row['Position']) || 100;
    const currentCtr = CTR_CURVE[pos] || 0.005;
    const currentTraffic = sv * currentCtr;
    const newPos = Math.max(1, pos - improvement);
    const newCtr = (CTR_CURVE[newPos] || 0.005) * multiplier;
    const newTraffic = sv * newCtr;
    const incremental = newTraffic - currentTraffic;
    const cocon = extractCocon(row['URL']);
    results[cocon] = (results[cocon] || 0) + incremental;
  });
  return results;
}

function render(results) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  const entries = Object.entries(results).sort((a,b) => b[1] - a[1]);
  const table = document.createElement('table');
  const header = document.createElement('tr');
  header.innerHTML = '<th>Cocon</th><th>Incremental Traffic</th>';
  table.appendChild(header);
  entries.forEach(([cocon, value]) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${cocon}</td><td>${value.toFixed(2)}</td>`;
    table.appendChild(row);
  });
  container.appendChild(table);

  const ctx = document.getElementById('chart').getContext('2d');
  if (window.chartInstance) {
    window.chartInstance.destroy();
  }
  window.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{
        label: 'Incremental Traffic',
        data: entries.map(e => e[1]),
        backgroundColor: 'rgba(54, 162, 235, 0.5)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('runBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
      alert('Please select an Excel file');
      return;
    }
    const improvement = Number(document.getElementById('improvement').value) || 0;
    const multiplier = Number(document.getElementById('ctrMultiplier').value) || 1;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet);
      const results = estimate(json, improvement, multiplier);
      render(results);
    };
    reader.readAsArrayBuffer(file);
  });
});
