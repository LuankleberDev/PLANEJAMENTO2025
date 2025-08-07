const sheetId = '15TFOc-3VDBy15W33K8u5yIc2ozOpNVwYQVl-gvTuInM';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=`;

async function fetchData(sheetName) {
  const res = await fetch(base + sheetName);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row => row.c.map(cell => cell ? cell.v : ''));
  return { headers, rows };
}

function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  const colunasOcultas = data.headers
    .map((h, i) => h.toLowerCase().includes("ok") ? i : -1)
    .filter(i => i !== -1);

  const colunasVisiveis = data.headers
    .map((_, i) => i)
    .filter(i => !colunasOcultas.includes(i));

  thead.innerHTML = '<tr>' +
    colunasVisiveis.map(i => `<th>${data.headers[i]}</th>`).join('') +
    '</tr>';

  tbody.innerHTML = data.rows.map(row => {
    return `<tr>${colunasVisiveis.map(idx => {
      const header = data.headers[idx].toLowerCase();
      const valor = row[idx];
      let bgColor = "";

      // FEITO ?
      if (header.startsWith("feito")) {
        const feito = valor?.toString().toUpperCase() === "SIM";
        if (feito) return `<td style="text-align: center;">✅</td>`;

        const vencimentoIndex = data.headers.findIndex(h =>
          h.toLowerCase().includes("preventiva") ||
          h.toLowerCase().includes("inspeção") ||
          h.toLowerCase().includes("programada") ||
          h.toLowerCase().includes("programação")
        );
        const vencimentoRaw = row[vencimentoIndex];
        if (!vencimentoRaw) return `<td style="text-align: center;"></td>`;

        let vencimentoDate = new Date(vencimentoRaw);
        if (!isNaN(vencimentoDate)) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          vencimentoDate.setHours(0, 0, 0, 0);

          const diffDias = Math.floor((vencimentoDate - hoje) / (1000 * 60 * 60 * 24));
          let texto = "";

          if (diffDias === 0) texto = "Vence hoje";
          else if (diffDias > 0) texto = `Faltam ${diffDias} dia${diffDias > 1 ? "s" : ""}`;
          else texto = `${diffDias} dias`;

          return `<td style="text-align: center; color: ${diffDias < 0 ? 'red' : 'black'};">${texto}</td>`;
        }

        return `<td style="text-align: center;"></td>`;
      }

      // CALIBRAGEM COM COLUNA OK
      if (header.includes("calibragem") && !header.includes("ok")) {
        const num = header.charAt(0);
        const okHeader = `${num}º ok`;
        const okIdx = data.headers.findIndex(h => h.toLowerCase().trim() === okHeader);
        const okValor = row[okIdx]?.toString().toUpperCase().trim();
        if (okValor === "OK") {
          bgColor = ' style="background-color: #e6ffe6"';
        }
      }

      // Formatar datas estilo Date(...)
      if (typeof valor === "string" && /^Date\(/.test(valor)) {
        const match = valor.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const [, year, month, day] = match.map(Number);
          const date = new Date(year, month, day);
          return `<td${bgColor}>${formatarData(date)}</td>`;
        }
      }

      return `<td${bgColor}>${valor}</td>`;
    }).join('')}</tr>`;
  }).join('');
}

function formatarData(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  document.getElementById(tabName).style.display = 'block';

  document.querySelectorAll('.tab-buttons button').forEach(button => {
    button.classList.remove('active');
  });

  if (tabName === 'preventivaTab') {
    document.querySelector('.tab-buttons button:nth-child(1)').classList.add('active');
  } else if (tabName === 'calibragemTab') {
    document.querySelector('.tab-buttons button:nth-child(2)').classList.add('active');
  } else if (tabName === 'inspecaoTab') {
    document.querySelector('.tab-buttons button:nth-child(3)').classList.add('active');
  }
}

function filterByTransportadora() {
  const input = document.getElementById("transportadoraInput").value.toLowerCase();

  document.querySelectorAll("table").forEach(table => {
    const headers = Array.from(table.querySelectorAll("thead th")).map(th =>
      th.textContent.trim().toLowerCase().replace(/\s/g, '')
    );

    const idxTransportadora = headers.findIndex(h => h.includes("transportadora"));
    const idxPlaca = headers.findIndex(h => h.includes("placa"));

    table.querySelectorAll("tbody tr").forEach(row => {
      const celulas = row.querySelectorAll("td");
      let alvo = "";

      if (idxTransportadora !== -1) {
        alvo = celulas[idxTransportadora]?.textContent.toLowerCase();
      } else if (idxPlaca !== -1) {
        alvo = celulas[idxPlaca]?.textContent.toLowerCase();
      } else {
        alvo = celulas[0]?.textContent.toLowerCase(); // fallback
      }

      row.style.display = alvo.includes(input) ? "" : "none";
    });
  });
}

async function init() {
  const preventiva = await fetchData("Planejamento Preventivas");
  const calibragem = await fetchData("Planejamento Calibragens");
  const inspecao = await fetchData("Planejamento Cavalo Mecânico");

  renderTable("preventivaTable", preventiva);
  renderTable("calibragemTable", calibragem);
  renderTable("inspecaoTable", inspecao);
}

init();
