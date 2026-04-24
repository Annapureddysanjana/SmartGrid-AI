function showPage(name, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".nav-links a").forEach(a => a.classList.remove("active"));
  if (el) el.classList.add("active");

  document.getElementById("nav-links").classList.remove("open");
  document.getElementById("hamburger").classList.remove("open");
}

document.getElementById("hamburger").addEventListener("click", function () {
  this.classList.toggle("open");
  document.getElementById("nav-links").classList.toggle("open");
});

function updateClock() {
  const el = document.getElementById("footer-time");
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-IN", { hour12: true });
  }
}

updateClock();
setInterval(updateClock, 1000);

function animateValue(el, target, suffix = "", duration = 800) {

  const start = parseFloat(el.dataset.current || 0) || 0;
  el.dataset.current = target;

  const startTime = performance.now();

  function update(ts) {

    const progress = Math.min((ts - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    const val = start + (target - start) * ease;

    el.textContent = Number.isInteger(target)
      ? Math.round(val) + suffix
      : val.toFixed(2) + suffix;

    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

async function loadData() {

  try {

    const res = await fetch("/predict");
    const data = await res.json();

    updateDashboard(data);

  } catch (err) {

    console.error("API error:", err);

  }
}

function updateDashboard(data) {

  const predEl = document.getElementById("prediction");
  const predVal = parseFloat(data.prediction);

  animateValue(predEl, predVal, " MW");

  animateValue(document.getElementById("temp"), parseInt(data.temp), " °C");
  animateValue(document.getElementById("wind"), parseInt(data.wind), " m/s");

  const statusEl = document.getElementById("status");
  const statusDot = document.getElementById("status-dot");

  statusEl.textContent = data.deficit;

  if (statusDot) {

    const colors = {
      "Stable": "#10b981",
      "Normal": "#06b6d4",
      "High Demand": "#f59e0b"
    };

    const color = colors[data.deficit] || "#06b6d4";

    statusDot.style.background = color;
    statusDot.style.boxShadow = `0 0 8px ${color}`;
  }

  document.getElementById("res").textContent = data.residential + " MW";
  document.getElementById("com").textContent = data.commercial + " MW";
  document.getElementById("ind").textContent = data.industrial + " MW";

  setTimeout(() => {
    document.getElementById("res-bar").style.width = data.res_percent + "%";
    document.getElementById("com-bar").style.width = data.com_percent + "%";
    document.getElementById("ind-bar").style.width = data.ind_percent + "%";
  }, 300);

  generateChart(data.hourly, "hour-chart");
  generateChart(data.hourly, "forecast-chart");

  const hourly = data.hourly;

  const peak = Math.max(...hourly);
  const min = Math.min(...hourly);
  const avg = (hourly.reduce((a, b) => a + b, 0) / hourly.length).toFixed(1);
  const peakHour = hourly.indexOf(peak);

  const formatHour = h => {
    const suffix = h < 12 ? "AM" : "PM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${suffix}`;
  };

  const peakHourEl = document.getElementById("peak-hour");
  const peakDemEl = document.getElementById("peak-demand");
  const minDemEl = document.getElementById("min-demand");
  const avgDemEl = document.getElementById("avg-demand");

  if (peakHourEl) peakHourEl.textContent = formatHour(peakHour);
  if (peakDemEl) peakDemEl.textContent = peak + " MW";
  if (minDemEl) minDemEl.textContent = min + " MW";
  if (avgDemEl) avgDemEl.textContent = avg + " MW";
}

async function refreshDashboard() {

  const btn = document.querySelector(".refresh-btn");

  if (btn) btn.innerText = "Updating...";

  await loadData();

  if (btn) btn.innerText = "⟳ Refresh";
}

function generateChart(values, containerId) {

  const chart = document.getElementById(containerId);
  if (!chart) return;

  chart.innerHTML = "";

  const max = Math.max(...values);

  values.forEach((v, i) => {

    const bar = document.createElement("div");

    bar.className = "bar";

    const pct = (v / max) * 190;

    bar.style.height = pct + "px";

    bar.style.animationDelay = (i * 25) + "ms";

    bar.setAttribute("data-val", v + " MW");

    chart.appendChild(bar);
  });
}

function initMap() {

  const center = { lat: 17.9689, lng: 79.5941 };

  const map = new google.maps.Map(document.getElementById("map"), {

    zoom: 7,
    center: center,
    mapTypeId: "roadmap",

    fullscreenControl: true,
    zoomControl: true,
    streetViewControl: false
  });

  const districts = [

    { lat: 17.385, lng: 78.486, name: "Hyderabad", load: "1,240 MW", status: "Stable", color: "#10b981" },
    { lat: 18.112, lng: 79.019, name: "Warangal", load: "820 MW", status: "High", color: "#f59e0b" },
    { lat: 18.438, lng: 79.128, name: "Karimnagar", load: "690 MW", status: "Stable", color: "#10b981" },
    { lat: 18.673, lng: 78.094, name: "Nizamabad", load: "540 MW", status: "Low", color: "#06b6d4" },
    { lat: 16.923, lng: 80.456, name: "Khammam", load: "410 MW", status: "Low", color: "#06b6d4" }

  ];

  districts.forEach(d => {

    const marker = new google.maps.Marker({

      position: { lat: d.lat, lng: d.lng },
      map: map,
      title: d.name,

      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: d.color,
        fillOpacity: 0.9,
        strokeColor: "#ffffff",
        strokeWeight: 2
      }
    });

    const infoWindow = new google.maps.InfoWindow({

      content: `
      <div style="background:#0c1526;color:#e2e8f0;padding:12px;border-radius:8px">
      <strong>${d.name}</strong><br>
      Load: ${d.load}<br>
      Status: <span style="color:${d.color}">${d.status}</span>
      </div>`
    });

    marker.addListener("click", () => infoWindow.open(map, marker));
  });
}

window.onload = loadData;

setInterval(loadData, 30000);