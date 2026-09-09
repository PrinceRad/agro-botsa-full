function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.add('hidden');
  });

  const screen = document.getElementById('screen-' + name);

  if (screen) {
    screen.classList.remove('hidden');
  }

  document.querySelectorAll('.app-nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
}


function navigateTo(name) {
  showScreen(name);

  if (name === 'weather' && window.loadWeather) {
    window.loadWeather();
  }

  if (name === 'diagnose' && window.loadDiagnoseHistory) {
    window.loadDiagnoseHistory();
  }

  if (name === 'activity' && window.loadActivities) {
    window.loadActivities();
  }
}


/* Navigation */
document.querySelectorAll('.app-nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    navigateTo(btn.dataset.screen);
  });
});


/* Hero button */
const heroCta = document.getElementById('hero-cta');

if (heroCta) {
  heroCta.addEventListener('click', () => {
    navigateTo('diagnose');
  });
}


/* =========================================================
   GUIDE PANEL
   ========================================================= */

const guidePanel = document.getElementById('guide-panel');
const guideBackdrop = document.getElementById('guide-backdrop');
const guideToggle = document.getElementById('guide-toggle');
const guideClose = document.getElementById('guide-close');

function openGuide() {
  if (guidePanel) {
    guidePanel.classList.remove('hidden');
  }

  if (guideBackdrop) {
    guideBackdrop.classList.remove('hidden');
  }
}

function closeGuide() {
  if (guidePanel) {
    guidePanel.classList.add('hidden');
  }

  if (guideBackdrop) {
    guideBackdrop.classList.add('hidden');
  }
}

if (guideToggle) {
  guideToggle.addEventListener('click', openGuide);
}

if (guideClose) {
  guideClose.addEventListener('click', closeGuide);
}

if (guideBackdrop) {
  guideBackdrop.addEventListener('click', closeGuide);
}

/* ---------- Growing Tips Carousel ---------- */

document.addEventListener("DOMContentLoaded", function () {
  const carousel = document.getElementById("tip-carousel-wrapper");
  const groups = document.getElementById("tip-groups");
  const prev = document.getElementById("tip-prev");
  const next = document.getElementById("tip-next");

  if (!carousel || !groups || !prev || !next) return;

  const totalGroups = groups.querySelectorAll(".tip-group").length;

  if (totalGroups === 0) return;

  let currentIndex = 0;
  let autoPlay = null;
  let isHovered = false;

  function showGroup(index) {
    currentIndex = (index + totalGroups) % totalGroups;

    groups.style.transform =
      `translateX(-${currentIndex * 100}%)`;
  }

  function startAutoPlay() {
    clearInterval(autoPlay);

    if (isHovered) return;

    autoPlay = setInterval(function () {
      showGroup(currentIndex + 1);
    }, 7000);
  }

  function stopAutoPlay() {
    clearInterval(autoPlay);
    autoPlay = null;
  }

  next.addEventListener("click", function () {
    showGroup(currentIndex + 1);

    /* Don't restart while the user is hovering */
    if (!isHovered) {
      startAutoPlay();
    }
  });

  prev.addEventListener("click", function () {
    showGroup(currentIndex - 1);

    /* Don't restart while the user is hovering */
    if (!isHovered) {
      startAutoPlay();
    }
  });

  carousel.addEventListener("mouseenter", function () {
    isHovered = true;
    stopAutoPlay();
  });

  carousel.addEventListener("mouseleave", function () {
    isHovered = false;
    startAutoPlay();
  });

  /* Start on first group */
  showGroup(0);
  startAutoPlay();
});