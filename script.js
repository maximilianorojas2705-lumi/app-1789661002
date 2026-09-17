(() => {
  const API_BASE = 'https://evo-v9-god-service.onrender.com/api';
  const API_KEY = '217402d05b597d84f340933744da1666';
  const APP_ID = 'app-1789661002';

  // Elementos del DOM (asumiendo IDs y clases estándar)
  const inputEl = document.getElementById('calc-input');
  const opButtons = document.querySelectorAll('.op-btn');
  const equalsBtn = document.getElementById('equals-btn');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const importCsvInput = document.getElementById('import-csv-input');

  // Historial en memoria
  let history = [];

  // ---------- Utilidades ----------
  const saveHistory = () => {
    localStorage.setItem('calcHistory', JSON.stringify(history));
  };

  const loadHistory = () => {
    const stored = localStorage.getItem('calcHistory');
    if (stored) {
      try {
        history = JSON.parse(stored);
      } catch (e) {
        console.error('Error al parsear el historial del localStorage', e);
        history = [];
      }
    }
  };

  const renderHistory = () => {
    historyList.innerHTML = '';
    history.forEach((entry, idx) => {
      const li = document.createElement('li');
      li.textContent = `${entry.expression} = ${entry.result}`;
      li.dataset.idx = idx;
      historyList.appendChild(li);
    });
  };

  const addToHistory = (expr, res) => {
    history.push({ expression: expr, result: res });
    saveHistory();
    renderHistory();
  };

  const clearHistory = () => {
    history = [];
    saveHistory();
    renderHistory();
  };

  const exportCSV = () => {
    if (history.length === 0) {
      alert('No hay historial para exportar.');
      return;
    }
    const header = 'Expresión,Resultado\n';
    const rows = history
      .map(e => `"${e.expression.replace(/"/g, '""')}","${e.result}"`)
      .join('\n');
    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calculadora_historial.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = file => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      const startIdx = lines[0].toLowerCase().startsWith('expresión') ? 1 : 0;
      const newEntries = [];
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^"(.*)","(.*)"$/);
        if (match) {
          newEntries.push({
            expression: match[1].replace(/""/g, '"'),
            result: match[2]
          });
        } else {
          const parts = line.split(',');
          if (parts.length >= 2) {
            newEntries.push({
              expression: parts[0].replace(/^"|"$/g, ''),
              result: parts[1].replace(/^"|"$/g, '')
            });
          }
        }
      }
      if (newEntries.length) {
        history = history.concat(newEntries);
        saveHistory();
        renderHistory();
        alert(`Se importaron ${newEntries.length} registros.`);
      } else {
        alert('No se encontraron registros válidos en el CSV.');
      }
    };
    reader.readAsText(file);
  };

  // ---------- Operaciones ----------
  const evaluateExpression = expr => {
    try {
      const sanitized = expr.replace(/[^\d.+\-*/() ]/g, '');
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${sanitized})`);
      const result = fn();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result;
      }
      throw new Error('Resultado no numérico');
    } catch (e) {
      console.error('Error al evaluar expresión:', e);
      return null;
    }
  };

  // ---------- Eventos ----------
  opButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const op = btn.dataset.op;
      if (op && inputEl) {
        inputEl.value += ` ${op} `;
        inputEl.focus();
      }
    });
  });

  if (equalsBtn) {
    equalsBtn.addEventListener('click', () => {
      const expr = inputEl.value.trim();
      if (!expr) return;
      const result = evaluateExpression(expr);
      if (result === null) {
        alert('Expresión inválida');
        return;
      }
      addToHistory(expr, result);
      inputEl.value = result;
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('¿Eliminar todo el historial?')) {
        clearHistory();
      }
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportCSV);
  }

  if (importCsvInput) {
    importCsvInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        importCSV(file);
        importCsvInput.value = '';
      }
    });
  }

  // ---------- Carga inicial ----------
  const init = async () => {
    loadHistory();
    renderHistory();

    try {
      const dataResp = await fetch(`${API_BASE}/data?app=${APP_ID}`, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      });
      const dataJson = await dataResp.json();
      console.log('Datos /data:', dataJson);
    } catch (e) {
      console.error('Error al obtener /data:', e);
    }

    try {
      const groqResp = await fetch(`${API_BASE}/groq?app=${APP_ID}`, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      });
      const groqJson = await groqResp.json();
      console.log('Datos /groq:', groqJson);
    } catch (e) {
      console.error('Error al obtener /groq:', e);
    }
  };

  init();
})();