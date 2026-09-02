document.getElementById('photo-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const resultEl = document.getElementById('diagnose-result');
  resultEl.textContent = 'Analyzing photo…';

  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res = await fetch('/api/diagnose', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.lowConfidence) {
      resultEl.innerHTML = `<p class="low-confidence">Not confident in this result (best guess: ${data.disease}). Try a clearer, closer photo.</p>`;
    } else {
      resultEl.innerHTML = `<p><strong>${data.disease}</strong></p><p>${data.recommendation}</p>`;
    }

    window.loadDiagnoseHistory();
  } catch (err) {
    resultEl.textContent = 'Could not analyze photo right now.';
  }
});

window.loadDiagnoseHistory = async function loadDiagnoseHistory() {
  const list = document.getElementById('diagnose-history');
  try {
    const res = await fetch('/api/diagnose');
    const items = await res.json();
    list.innerHTML = items
      .slice()
      .reverse()
      .map((item) => `<li>${item.disease} — ${new Date(item.createdAt).toLocaleDateString()}</li>`)
      .join('');
  } catch (err) {
    list.innerHTML = '<li>Could not load history.</li>';
  }
};
