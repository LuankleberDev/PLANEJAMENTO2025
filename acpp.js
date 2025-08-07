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

  // Colunas que não devem aparecer na tabela de calibragens
  const isCalibragem = tableId.includes("calibragem");
  const colunasOcultas = isCalibragem ? ["Oficina", "Preventivas"] : [];

  // Índices das colunas visíveis
  const colunasVisiveis = data.headers
    .map((header, index) => colunasOcultas.includes(header) ? null : index)
    .filter(index => index !== null);

  // Cabeçalho
  thead.innerHTML = '<tr>' +
    colunasVisiveis.map(i => `<th>${data.headers[i]}</th>`).join('') +
    '</tr>';

  // Corpo da tabela
  tbody.innerHTML = data.rows.map(row => {
    return `<tr>${colunasVisiveis.map(idx => {
      const header = data.headers[idx];
      const cell = row[idx];

      // Trata a coluna "Feito ?"
      if (header.toLowerCase().startsWith("feito")) {
        const feito = cell?.toString().toUpperCase() === "SIM";
        if (feito) return `<td style="text-align: center;">✅</td>`;

        // Identifica a data de vencimento
        const vencimentoIndex = data.headers.findIndex(h =>
          h.toLowerCase().includes("preventiva") ||
          h.toLowerCase().includes("inspeção") ||
          h.toLowerCase().includes("programada") ||
          h.toLowerCase().includes("programação") // ✅ adicionado
        );
        const vencimentoRaw = row[vencimentoIndex];
        if (!vencimentoRaw) return `<td style="text-align: center;"></td>`;

        let vencimentoDate = null;

        if (typeof vencimentoRaw === "string" && /^Date\(/.test(vencimentoRaw)) {
          const match = vencimentoRaw.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            const [, year, month, day] = match.map(Number);
            vencimentoDate = new Date(year, month, day);
          }
        } else {
          vencimentoDate = new Date(vencimentoRaw);
        }

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

      // Formata células Date(...) como dd/mm/aaaa
      if (typeof cell === "string" && /^Date\(/.test(cell)) {
        const match = cell.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const [, year, month, day] = match.map(Number);
          const date = new Date(year, month, day);
          return `<td>${formatarData(date)}</td>`;
        }
      }

      return `<td>${cell}</td>`;
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

// Filtro inteligente por transportadora ou placa
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
