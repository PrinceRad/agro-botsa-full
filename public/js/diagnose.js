const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewImage = document.getElementById('photo-preview-image');
const photoFileName = document.getElementById('photo-file-name');
const photoRemove = document.getElementById('photo-remove');
const diagnoseSubmit = document.getElementById('diagnose-submit');
const resultEl = document.getElementById('diagnose-result');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
let selectedFile = null;
let previewUrl = null;

function showResult(message, state) {
  resultEl.className = `diagnose-result diagnose-result-${state}`;
  resultEl.innerHTML = message;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  }[character]));
}

function clearPhoto() {
  selectedFile = null;
  photoInput.value = '';
  photoPreview.classList.add('hidden');
  diagnoseSubmit.disabled = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  showResult('<span class="result-mark" aria-hidden="true">+</span><p>Upload a photo to get started.</p>', 'empty');
}

photoInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/') || file.size > MAX_FILE_SIZE) {
    clearPhoto();
    showResult('<p><strong>Choose a smaller image</strong></p><p>Please use a JPG, PNG or WebP image under 10 MB.</p>', 'error');
    return;
  }

  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  photoPreviewImage.src = previewUrl;
  photoFileName.textContent = file.name;
  photoPreview.classList.remove('hidden');
  diagnoseSubmit.disabled = false;
  showResult('<span class="result-mark" aria-hidden="true">+</span><p>Ready when you are.</p>', 'empty');
});

photoRemove.addEventListener('click', clearPhoto);

diagnoseSubmit.addEventListener('click', async () => {
  if (!selectedFile) return;

  diagnoseSubmit.disabled = true;
  showResult('<span class="loading-dot" aria-hidden="true"></span><p>Reading your plant photo...</p>', 'loading');

  const formData = new FormData();
  formData.append('photo', selectedFile);

  try {
    const res = await fetch('/api/diagnose', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Diagnosis failed');

    if (data.lowConfidence) {
      showResult(`<p class="result-label result-warning">Needs a closer look</p><h4>${escapeHtml(data.disease)}</h4><p>We are not confident in this result. Try a clearer, closer photo in better light.</p>`, 'warning');
    } else {
      showResult(`<p class="result-label">Likely diagnosis</p><h4>${escapeHtml(data.disease)}</h4><p>${escapeHtml(data.recommendation)}</p>`, 'success');
    }

    window.loadDiagnoseHistory();
  } catch (err) {
    showResult('<p><strong>We could not analyze that photo.</strong></p><p>Check your connection and try again.</p>', 'error');
  } finally {
    diagnoseSubmit.disabled = false;
  }
});

window.loadDiagnoseHistory = async function loadDiagnoseHistory() {
  const list = document.getElementById('diagnose-history');
  try {
    const res = await fetch('/api/diagnose');
    const items = await res.json();
    const diagnoses = items.slice().reverse();
    list.innerHTML = diagnoses.length ? diagnoses.map((item) => `
      <li>
        <span><strong>${escapeHtml(item.disease)}</strong><small>${new Date(item.createdAt).toLocaleDateString()}</small></span>
        <em class="history-status ${item.lowConfidence ? 'is-warning' : ''}">${item.lowConfidence ? 'Uncertain' : 'Reviewed'}</em>
      </li>
    `).join('') : '<li class="history-empty">No diagnoses yet. Your saved results will appear here.</li>';
  } catch (err) {
    list.innerHTML = '<li class="history-empty">Could not load history right now.</li>';
  }
};
