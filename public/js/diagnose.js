const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewImage = document.getElementById('photo-preview-image');
const photoFileName = document.getElementById('photo-file-name');
const photoRemove = document.getElementById('photo-remove');
const diagnoseSubmit = document.getElementById('diagnose-submit');
const savePhoto = document.getElementById('save-photo');
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

function exportDiagnosis(id) {
  window.location.assign(`/api/diagnose/${encodeURIComponent(id)}/export`);
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
  formData.append('savePhoto', savePhoto.checked ? 'true' : 'false');

  try {
    const res = await fetch('/api/diagnose', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Diagnosis failed');

    const sampleBanner = data.placeholder
      ? '<p class="result-sample-banner">Sample result — real photo analysis is not connected yet. This is a placeholder, not an actual diagnosis of your photo.</p>'
      : '';

    const categoryNote = data.recommendationMatch === 'category'
      ? '<p class="result-category-note">This is general guidance for a similar type of issue, not a confirmed match for this specific disease.</p>'
      : '';

    if (data.lowConfidence) {
      showResult(`${sampleBanner}<p class="result-label result-warning">Needs a closer look</p><h4>${escapeHtml(data.disease)}</h4><p>We are not confident in this result. Try a clearer, closer photo in better light.</p><button type="button" id="export-diagnosis" class="log-treatment">Export diagnosis</button>`, 'warning');
    } else {
      showResult(`${sampleBanner}<p class="result-label">Likely diagnosis</p><h4>${escapeHtml(data.disease)}</h4>${categoryNote}<p>${escapeHtml(data.recommendation)}</p><button type="button" id="log-treatment" class="log-treatment">Log treatment</button><button type="button" id="export-diagnosis" class="log-treatment">Export diagnosis</button>`, 'success');
      document.getElementById('log-treatment').addEventListener('click', () => {
        window.prefillActivity({ type: 'sprayed', notes: `Treatment for ${data.disease}: ${data.recommendation}` });
        document.querySelector('.app-nav button[data-screen="activity"]').click();
      });
    }

    document.getElementById('export-diagnosis').addEventListener('click', () => exportDiagnosis(data.id));

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
      <li data-id="${item.id}">
        ${item.photoUrl
          ? `<img src="${item.photoUrl}" alt="${escapeHtml(item.disease)}" class="history-thumb" />`
          : item.photoRemoved
            ? '<div class="history-thumb history-thumb-removed" title="Photo removed to save space"></div>'
            : '<div class="history-thumb history-thumb-empty"></div>'}
        <span><strong>${escapeHtml(item.disease)}</strong><small>${new Date(item.createdAt).toLocaleDateString()}</small></span>
        <em class="history-status ${item.lowConfidence ? 'is-warning' : ''}">${item.lowConfidence ? 'Uncertain' : 'Reviewed'}</em>
        <button type="button" class="history-export" aria-label="Export this diagnosis">Export</button>
        <button type="button" class="history-delete" aria-label="Delete this diagnosis">✕</button>
      </li>
    `).join('') : '<li class="history-empty">No diagnoses yet. Your saved results will appear here.</li>';

    list.querySelectorAll('.history-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        if (!confirm('Delete this diagnosis?')) return;
        try {
          await fetch(`/api/diagnose/${id}`, { method: 'DELETE' });
          window.loadDiagnoseHistory();
        } catch (err) {
          alert('Could not delete right now.');
        }
      });
    });

    list.querySelectorAll('.history-export').forEach((btn) => {
      btn.addEventListener('click', (e) => exportDiagnosis(e.target.closest('li').dataset.id));
    });
  } catch (err) {
    list.innerHTML = '<li class="history-empty">Could not load history right now.</li>';
  }
};
