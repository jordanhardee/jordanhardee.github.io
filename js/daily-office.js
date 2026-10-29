// Select the current office using the visitor's local time.
// The 2019 BCP publisher requires permission before including its liturgical
// text in an app, so the complete service is linked rather than copied here.
(function () {
  const offices = {
    morning: {
      name: 'Morning Prayer',
      description: 'Begin the day with the appointed psalms, Scripture readings, and prayers.'
    },
    noonday: {
      name: 'Midday Prayer',
      description: 'Pause at midday for the short office of prayer.'
    },
    evening: {
      name: 'Evening Prayer',
      description: 'Close the day with the appointed psalms, Scripture readings, and prayers.'
    },
    compline: {
      name: 'Compline',
      description: 'The office of prayer before sleep.'
    }
  };
  const date = document.getElementById('office-date');
  const period = document.getElementById('office-period');
  const name = document.getElementById('office-name');
  const collect = document.getElementById('office-collect-title');
  const prayer = document.getElementById('office-prayer');
  const link = document.getElementById('office-full-link');
  if (!date || !period || !name || !collect || !prayer || !link) return;

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
    collect.textContent = '2019 Book of Common Prayer · Current Office';
    prayer.textContent = `${office.description} Open the full 2019 BCP office below to pray today's text and readings.`;
    // The Daily Office site automatically chooses today's service and offers
    // switching between Morning, Midday, Evening, and Compline.
    link.href = 'https://www.dailyoffice2019.com/';
    link.setAttribute('aria-label', `Pray today's ${office.name} and appointed readings from the 2019 Book of Common Prayer`);
  }

  update();
  window.setInterval(update, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
})();
