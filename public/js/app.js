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

// hero-cta is optional — only wire it up if it exists on the page
const heroCta = document.getElementById('hero-cta');
if (heroCta) {
  heroCta.addEventListener('click', () => navigateTo('diagnose'));
}

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

/* =========================================================
   GROWING TIPS CAROUSEL
   3 cards per slide
   Auto-advance every 7 seconds
   Pauses while hovering
   Previous / Next controls
   ========================================================= */

function initTipCarousel() {
  const wrapper = document.getElementById("tip-carousel-wrapper");
  const track = document.getElementById("tip-track");
  const prevButton = document.getElementById("tip-prev");
  const nextButton = document.getElementById("tip-next");

  if (!wrapper || !track || !prevButton || !nextButton) {
    return;
  }

  const groups = Array.from(track.querySelectorAll(".tip-group"));

  if (groups.length === 0) {
    return;
  }

  let currentIndex = 0;
  let autoRotateTimer = null;

  const AUTO_ROTATE_DELAY = 7000;

  function updateCarousel() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % groups.length;
    updateCarousel();
  }

  function showPrevious() {
    currentIndex =
      (currentIndex - 1 + groups.length) % groups.length;

    updateCarousel();
  }

  function startAutoRotate() {
    stopAutoRotate();

    autoRotateTimer = setInterval(() => {
      showNext();
    }, AUTO_ROTATE_DELAY);
  }

  function stopAutoRotate() {
    if (autoRotateTimer !== null) {
      clearInterval(autoRotateTimer);
      autoRotateTimer = null;
    }
  }

  /* Buttons */
  nextButton.addEventListener("click", () => {
    showNext();
    startAutoRotate();
  });

  prevButton.addEventListener("click", () => {
    showPrevious();
    startAutoRotate();
  });

  /* Pause while user is reading */
  wrapper.addEventListener("mouseenter", () => {
    stopAutoRotate();
  });

  wrapper.addEventListener("mouseleave", () => {
    startAutoRotate();
  });

  /* Keyboard accessibility */
  wrapper.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      showNext();
      startAutoRotate();
    }

    if (event.key === "ArrowLeft") {
      showPrevious();
      startAutoRotate();
    }
  });

  /* Start at group 1 */
  updateCarousel();

  /* Start automatic rotation */
  startAutoRotate();
}


/* Start carousel */
document.addEventListener("DOMContentLoaded", () => {
  initTipCarousel();
});