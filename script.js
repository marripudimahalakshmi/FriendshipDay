(function(){
  const inputC = document.getElementById('inputC');
  const inputF = document.getElementById('inputF');
  const inputK = document.getElementById('inputK');
  const scaleC = document.getElementById('scaleC');
  const scaleF = document.getElementById('scaleF');
  const scaleK = document.getElementById('scaleK');
  const needlePivot = document.getElementById('needlePivot');
  const readoutValue = document.getElementById('readoutValue');
  const readoutUnit = document.getElementById('readoutUnit');
  const ticksGroup = document.getElementById('ticksGroup');

  const DIAL_MIN = -40;   // celsius
  const DIAL_MAX = 50;    // celsius
  const ANGLE_MIN = -135; // degrees, needle rotation
  const ANGLE_MAX = 135;

  const cx = 140, cy = 158, rOuter = 118, rInner = 100, rLabel = 82;

  // Build tick marks & labels around the dial (mapped -40..50 across the arc)
  function buildTicks(){
    const majorStep = 10;
    for (let t = DIAL_MIN; t <= DIAL_MAX; t += 5) {
      const frac = (t - DIAL_MIN) / (DIAL_MAX - DIAL_MIN);
      const angle = ANGLE_MIN + frac * (ANGLE_MAX - ANGLE_MIN);
      const rad = (angle - 90) * Math.PI / 180;
      const isMajor = (t % majorStep === 0);
      const r1 = rOuter;
      const r2 = isMajor ? rInner : rInner + 8;
      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy + r2 * Math.sin(rad);

      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('class', 'tick' + (isMajor ? ' major' : ''));
      ticksGroup.appendChild(line);

      if (isMajor) {
        const lx = cx + rLabel * Math.cos(rad);
        const ly = cy + rLabel * Math.sin(rad);
        const text = document.createElementNS('http://www.w3.org/2000/svg','text');
        text.setAttribute('x', lx); text.setAttribute('y', ly + 4);
        text.setAttribute('class', 'tick-label');
        text.textContent = t;
        ticksGroup.appendChild(text);
      }
    }
  }
  buildTicks();

  function setNeedle(celsius){
    const clamped = Math.max(DIAL_MIN, Math.min(DIAL_MAX, celsius));
    const frac = (clamped - DIAL_MIN) / (DIAL_MAX - DIAL_MIN);
    const angle = ANGLE_MIN + frac * (ANGLE_MAX - ANGLE_MIN);
    needlePivot.style.transform = `rotate(${angle}deg)`;
  }

  function setReadout(celsius){
    readoutValue.textContent = celsius.toFixed(1);
    readoutUnit.textContent = 'DEGREES CELSIUS';
    if (celsius <= 0) {
      readoutValue.style.color = '#2c4a5c';
    } else if (celsius >= 30) {
      readoutValue.style.color = '#8a2415';
    } else {
      readoutValue.style.color = '';
    }
  }

  function highlightActive(scaleEl){
    [scaleC, scaleF, scaleK].forEach(s => s.classList.remove('active'));
    scaleEl.classList.add('active');
  }

  function update(source, celsius){
    if (isNaN(celsius)) return;
    const f = celsius * 9/5 + 32;
    const k = celsius + 273.15;

    if (source !== inputC) inputC.value = round(celsius);
    if (source !== inputF) inputF.value = round(f);
    if (source !== inputK) inputK.value = round(k);

    setNeedle(celsius);
    setReadout(celsius);
  }

  function round(n){
    return Math.round(n * 100) / 100;
  }

  inputC.addEventListener('input', () => {
    highlightActive(scaleC);
    update(inputC, parseFloat(inputC.value));
  });

  inputF.addEventListener('input', () => {
    highlightActive(scaleF);
    const f = parseFloat(inputF.value);
    update(inputF, (f - 32) * 5/9);
  });

  inputK.addEventListener('input', () => {
    highlightActive(scaleK);
    const k = parseFloat(inputK.value);
    update(inputK, k - 273.15);
  });

  // initial state
  update(inputC, parseFloat(inputC.value));

  // --- Location-based current temperature (city search) ---
  const locateBtn = document.getElementById('locateBtn');
  const cityInput = document.getElementById('cityInput');
  const locateStatus = document.getElementById('locateStatus');

  async function searchCity(){
    const city = cityInput.value.trim();
    if (!city) {
      locateStatus.textContent = 'Type a city name first';
      return;
    }
    locateBtn.disabled = true;
    locateStatus.textContent = 'Searching…';

    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        locateStatus.textContent = `No match for "${city}"`;
        locateBtn.disabled = false;
        return;
      }

      const place = geoData.results[0];
      locateStatus.textContent = 'Fetching temperature…';

      const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m`);
      const wxData = await wxRes.json();
      const temp = wxData.current.temperature_2m;

      highlightActive(scaleC);
      update(inputC, temp);

      const label = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
      locateStatus.textContent = `${temp.toFixed(1)}°C in ${label}`;
    } catch (err) {
      locateStatus.textContent = 'Blocked here — download the file and open it in your browser';
    } finally {
      locateBtn.disabled = false;
    }
  }

  locateBtn.addEventListener('click', searchCity);
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchCity();
  });
})();