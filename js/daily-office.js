// Open the full appointed 2019 Daily Office for the reader's local date/time.
// We embed the source site's service rather than reproducing its liturgy.
(function () {
  const offices = {
    morning: { name: 'Morning Prayer', path: 'morning_prayer' },
    noonday: { name: 'Midday Prayer', path: 'midday_prayer' },
    evening: { name: 'Evening Prayer', path: 'evening_prayer' },
    compline: { name: 'Compline', path: 'compline' }
  };
  const date = document.getElementById('office-date');
  const period = document.getElementById('office-period');
  const name = document.getElementById('office-name');
  const link = document.getElementById('office-full-link');
  const frame = document.getElementById('office-service-frame');
  if (!date || !period || !name || !link || !frame) return;

  function currentOffice(hour) {
    if (hour >= 5 && hour < 11) return offices.morning;
    if (hour >= 11 && hour < 16) return offices.noonday;
    if (hour >= 16 && hour < 21) return offices.evening;
    return offices.compline;
  }

  function update() {
    const now = new Date();
    const office = currentOffice(now.getHours());
    date.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    period.textContent = 'LOCAL ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    name.textContent = office.name;
    // Use the visitor's *local* calendar date, not UTC, so midnight and people
    // in other time zones select the correct day's appointed readings.
    const url = `https://www.dailyoffice2019.com/${office.path}/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    if (!frame.closest('.module-closed') && frame.getAttribute('src') !== url) frame.setAttribute('src', url);
    link.href = url;
    link.setAttribute('aria-label', `Pray today's ${office.name} and appointed readings from the 2019 Book of Common Prayer`);
  }

  update();
  document.addEventListener('xp:window-opened', event => {
    if (event.detail?.window === 'daily-office') update();
  });
  window.setInterval(update, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
})();
