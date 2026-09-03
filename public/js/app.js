function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  document.getElementById('screen-' + name).classList.remove('hidden');

  document.querySelectorAll('.app-nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
}

function navigateTo(name) {
  showScreen(name);
  if (name === 'weather' && window.loadWeather) window.loadWeather();
  if (name === 'diagnose' && window.loadDiagnoseHistory) window.loadDiagnoseHistory();
  if (name === 'activity' && window.loadActivities) window.loadActivities();
}

document.querySelectorAll('.app-nav button').forEach((btn) => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.screen));
});

const heroCta = document.getElementById('hero-cta');
if (heroCta) heroCta.addEventListener('click', () => navigateTo('diagnose'));

// Guide panel (real slide-in, not decorative)
const guidePanel = document.getElementById('guide-panel');
const guideBackdrop = document.getElementById('guide-backdrop');

function openGuide() {
  guidePanel.classList.remove('hidden');
  guideBackdrop.classList.remove('hidden');
}

function closeGuide() {
  guidePanel.classList.add('hidden');
  guideBackdrop.classList.add('hidden');
}

document.getElementById('guide-toggle').addEventListener('click', openGuide);
document.getElementById('guide-close').addEventListener('click', closeGuide);
guideBackdrop.addEventListener('click', closeGuide);

navigateTo('home');