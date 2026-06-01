// =============================================
// AGROCAST AI — SCRIPT.JS
// Fixed theme toggle + enhanced insights
// =============================================

const API = 'https://agrocast-ai.onrender.com';
let forecastData = [];

// ── ELEMENTS ─────────────────────────────────
const cityInput   = document.getElementById('cityInput');
const weatherBtn  = document.getElementById('weatherBtn');
const forecastBtn = document.getElementById('forecastBtn');
const downloadBtn = document.getElementById('downloadBtn');
const themeToggle = document.getElementById('themeToggle');

// ── THEME TOGGLE (BUG FIXED) ──────────────────
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
});

// ── ENTER KEY on city input ───────────────────
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') weatherBtn.click();
});

// =============================================
// LIVE WEATHER
// =============================================
weatherBtn.addEventListener('click', async () => {
  const city = cityInput.value.trim();
  if (!city) { alert('Please enter a city name'); return; }

  const wc = document.getElementById('weatherContent');
  wc.innerHTML = `<div class="loading-row"><div class="loading"></div> Fetching weather data for "${city}"...</div>`;

  try {
    const res  = await fetch(`${API}/weather?city=${encodeURIComponent(city)}`);
    const data = await res.json();

    if (data.cod && data.cod !== 200) {
      wc.innerHTML = `<div style="color:var(--red);padding:16px 0">❌ City not found. Check spelling and try again.</div>`;
      return;
    }

    const hum   = data.main.humidity;
    const humTip = hum > 80
      ? '⚠ High humidity — monitor crops for fungal disease risk'
      : hum > 60
        ? '✅ Moderate humidity — suitable for most crops'
        : '💧 Low humidity — consider scheduling irrigation';

    const vis = data.visibility ? (data.visibility / 1000).toFixed(1) + ' km' : 'N/A';

    wc.innerHTML = `
      <div class="weather-main">
        <div>
          <div class="weather-loc">${data.name}, ${data.sys.country}</div>
          <div class="weather-desc">${data.weather[0].description}</div>
          <div class="weather-big">${Math.round(data.main.temp)}<span>°C</span></div>
          <div class="feels-like">Feels like ${Math.round(data.main.feels_like)}°C</div>
        </div>
        <div class="weather-stats">
          <div class="w-stat">
            <div class="w-stat-label">Humidity</div>
            <div class="w-stat-val" style="color:var(--green2)">${data.main.humidity}%</div>
          </div>
          <div class="w-stat">
            <div class="w-stat-label">Wind Speed</div>
            <div class="w-stat-val">${data.wind.speed} m/s</div>
          </div>
          <div class="w-stat">
            <div class="w-stat-label">Pressure</div>
            <div class="w-stat-val">${data.main.pressure} hPa</div>
          </div>
          <div class="w-stat">
            <div class="w-stat-label">Visibility</div>
            <div class="w-stat-val">${vis}</div>
          </div>
        </div>
      </div>
      <div class="humidity-tip">
        💡 <strong>Humidity Status:</strong> ${humTip}
      </div>`;

  } catch (err) {
    console.error(err);
    document.getElementById('weatherContent').innerHTML =
      `<div style="color:var(--red);padding:16px 0">
        ❌ Failed to connect. Render backend may be cold-starting (takes ~30 sec).
        Please wait a moment and try again.
      </div>`;
  }
});

// =============================================
// FORECAST
// =============================================
forecastBtn.addEventListener('click', async () => {
  document.getElementById('chartWrap').innerHTML =
    `<div class="chart-placeholder"><div class="loading"></div><span>Generating 100-day SARIMAX forecast...</span></div>`;
  document.getElementById('insightsWrap').innerHTML =
    `<div class="loading-row"><div class="loading"></div> Computing AI crop insights...</div>`;

  try {
    const res  = await fetch(`${API}/forecast`);
    const data = await res.json();
    forecastData = data.humidity_predictions;

    renderChart(forecastData);
    renderStats(forecastData);
    renderInsights(forecastData);

    document.getElementById('statsRow').style.display = 'grid';

  } catch (err) {
    console.error(err);
    document.getElementById('chartWrap').innerHTML =
      `<div class="chart-placeholder" style="color:var(--red)">
        ❌ Forecast failed. Backend may be cold-starting — try again in 30 seconds.
      </div>`;
    document.getElementById('insightsWrap').innerHTML = '';
  }
});

// =============================================
// CHART
// =============================================
function renderChart(data) {
  document.getElementById('chartWrap').innerHTML =
    `<div class="chart-wrap"><canvas id="forecastChart"></canvas></div>`;

  const ctx = document.getElementById('forecastChart');
  if (window._agroChart) window._agroChart.destroy();

  // 7-day moving average
  const movingAvg = data.map((_, i) => {
    if (i < 6) return null;
    const slice = data.slice(i - 6, i + 1);
    return parseFloat((slice.reduce((a, b) => a + b, 0) / 7).toFixed(2));
  });

  window._agroChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => `Day ${i + 1}`),
      datasets: [
        {
          label: 'Humidity Forecast (%)',
          data,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#22c55e',
          tension: 0.4,
          fill: true,
        },
        {
          label: '7-Day Moving Avg',
          data: movingAvg,
          borderColor: '#fbbf24',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          spanGaps: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#a0b8a0',
            font: { family: 'Outfit', size: 12 },
            boxWidth: 18,
            padding: 16,
          }
        },
        tooltip: {
          backgroundColor: '#1c251c',
          borderColor: '#2a3a2a',
          borderWidth: 1,
          titleColor: '#e8f5e8',
          bodyColor: '#a0b8a0',
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : 'N/A'}%`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#5a785a',
            font: { size: 10, family: 'DM Mono' },
            maxTicksLimit: 14,
          },
          grid: { color: 'rgba(42,58,42,0.5)' }
        },
        y: {
          min: 30,
          max: 100,
          ticks: {
            color: '#5a785a',
            font: { size: 10, family: 'DM Mono' },
            callback: (v) => v + '%'
          },
          grid: { color: 'rgba(42,58,42,0.5)' }
        }
      }
    }
  });
}

// =============================================
// STAT CARDS
// =============================================
function renderStats(data) {
  const avg    = data.reduce((a, b) => a + b, 0) / data.length;
  const max    = Math.max(...data);
  const min    = Math.min(...data);
  const maxDay = data.indexOf(max) + 1;
  const minDay = data.indexOf(min) + 1;

  document.getElementById('statAvg').innerHTML =
    `${avg.toFixed(1)}<span class="card-unit">%</span>`;
  document.getElementById('statAvgTip').textContent =
    avg > 75 ? '⚠ Elevated — disease risk' : '✅ Within normal range';

  document.getElementById('statPeak').innerHTML =
    `${max.toFixed(1)}<span class="card-unit">% · Day ${maxDay}</span>`;
  document.getElementById('statPeakTip').textContent = 'Peak forecast humidity point';

  document.getElementById('statLow').innerHTML =
    `${min.toFixed(1)}<span class="card-unit">% · Day ${minDay}</span>`;
  document.getElementById('statLowTip').textContent = 'Lowest forecast humidity point';
}

// =============================================
// AI INSIGHTS
// =============================================
function renderInsights(data) {
  const avg      = data.reduce((a, b) => a + b, 0) / data.length;
  const max      = Math.max(...data);
  const min      = Math.min(...data);
  const trend    = data[data.length - 1] - data[0];
  const highDays = data.filter(v => v > 80).length;
  const lowDays  = data.filter(v => v < 50).length;
  const range    = max - min;

  const cards = [
    {
      cls:   avg > 75 ? 'warn' : 'good',
      title: avg > 75 ? '⚠ High Humidity Alert' : '✅ Humidity Normal',
      body:  avg > 75
        ? `Average forecast is ${avg.toFixed(1)}% — conditions favour fungal diseases like blight and rust. Apply preventive fungicide early.`
        : `Average ${avg.toFixed(1)}% — comfortable range for most kharif and rabi crops. Maintain standard care practices.`
    },
    {
      cls:   highDays > 30 ? 'danger' : 'info',
      title: '📊 High-Risk Days',
      body:  `${highDays} out of 100 forecast days exceed 80% humidity. ${highDays > 30 ? 'Plan protective spray windows for these periods.' : 'Risk is manageable with standard monitoring.'}`
    },
    {
      cls:   trend > 5 ? 'warn' : trend < -5 ? 'info' : 'good',
      title: trend > 5 ? '📈 Rising Trend' : trend < -5 ? '📉 Falling Trend' : '➡ Stable Trend',
      body:  trend > 0
        ? `Humidity rising by ~${trend.toFixed(1)}% over 100 days. Expect progressively wetter conditions toward end of season.`
        : trend < 0
          ? `Humidity dropping by ~${Math.abs(trend).toFixed(1)}% over 100 days. Drier conditions expected as the season progresses.`
          : `Humidity remains relatively stable over the forecast period — good for consistent crop management.`
    },
    {
      cls:   'info',
      title: '🌾 Crop Recommendation',
      body:  avg > 75
        ? 'Prefer disease-resistant varieties. Ensure proper field drainage and canopy airflow to reduce fungal pressure.'
        : 'Favourable for wheat, cotton, and pulses. Standard care and timely irrigation will be sufficient.'
    },
    {
      cls:   lowDays > 10 ? 'warn' : 'good',
      title: '💧 Irrigation Planning',
      body:  lowDays > 10
        ? `${lowDays} forecast days show humidity below 50% — supplemental irrigation will be critical during these dry spells.`
        : 'Humidity levels support natural moisture balance. Check soil before each irrigation cycle to avoid overwatering.'
    },
    {
      cls:   range > 35 ? 'warn' : 'info',
      title: '📅 Seasonal Variability',
      body:  `Forecast spans ${min.toFixed(0)}% – ${max.toFixed(0)}% (range: ${range.toFixed(0)}%). ${range > 35 ? 'High variability — maintain close monitoring throughout the season.' : 'Relatively stable conditions ahead.'}`
    }
  ];

  document.getElementById('insightsWrap').innerHTML = `
    <div class="insight-grid">
      ${cards.map(c => `
        <div class="insight-item ${c.cls}">
          <div class="insight-title">${c.title}</div>
          <div class="insight-body">${c.body}</div>
        </div>`).join('')}
    </div>`;
}

// =============================================
// DOWNLOAD CSV
// =============================================
downloadBtn.addEventListener('click', () => {
  if (!forecastData.length) {
    alert('Please generate a forecast first.');
    return;
  }

  let csv = 'Day,Humidity (%)\n';
  forecastData.forEach((v, i) => {
    csv += `${i + 1},${v.toFixed(2)}\n`;
  });

  const a = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'agrocast_humidity_forecast.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
