// A time-appropriate collect from the 1979 Book of Common Prayer, Rite II.
// These are representative prayers from each office, not the day's complete
// rotating lectionary. The linked service supplies today's full texts/readings.
(function () {
  const offices = {
    morning: {
      name: 'Morning Prayer',
      collect: 'A Collect for Guidance',
      prayer: 'Heavenly Father, in you we live and move and have our being: We humbly pray you so to guide and govern us by your Holy Spirit, that in all the cares and occupations of our life we may not forget you, but may remember that we are ever walking in your sight; through Jesus Christ our Lord. Amen.',
      path: 'morning-prayer/'
    },
    noonday: {
      name: 'Noonday Prayer',
      collect: 'A Collect for Guidance',
      prayer: 'Heavenly Father, send your Holy Spirit into our hearts, to direct and rule us according to your will, to comfort us in all our afflictions, to defend us from all error, and to lead us into all truth; through Jesus Christ our Lord. Amen.',
      path: 'noonday-prayer/'
    },
    evening: {
      name: 'Evening Prayer',
      collect: 'A Collect for the Presence of Christ',
      prayer: 'Lord Jesus, stay with us, for evening is at hand and the day is past; be our companion in the way, kindle our hearts, and awaken hope, that we may know you as you are revealed in Scripture and the breaking of bread. Grant this for the sake of your love. Amen.',
      path: 'evening-prayer/'
    },
    compline: {
      name: 'Compline',
      collect: 'A Collect for the Night',
      prayer: 'Be our light in the darkness, O Lord, and in your great mercy defend us from all perils and dangers of this night; for the love of your only Son, our Savior Jesus Christ. Amen.',
      path: 'compline/'
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
    collect.textContent = office.collect + ' · 1979 BCP, Rite II';
    prayer.textContent = office.prayer;
    link.href = `https://usedailyoffice.com/1979/${office.path}`;
    link.setAttribute('aria-label', `Read today's full ${office.name} and appointed readings (1979 BCP)`);
  }

  update();
  window.setInterval(update, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
})();
