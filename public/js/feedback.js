(function () {
  const btn = document.getElementById('feedback-btn');
  const modal = document.getElementById('feedback-modal');
  const closeBtn = document.getElementById('feedback-close');
  const thumbs = document.querySelectorAll('.feedback-thumb');
  const commentBox = document.getElementById('feedback-comment');
  const submitBtn = document.getElementById('feedback-submit');
  const thanksMsg = document.getElementById('feedback-thanks');

  let selectedRating = null;

  function openModal() {
    modal.classList.remove('hidden');
    thanksMsg.classList.add('hidden');
    commentBox.value = '';
    selectedRating = null;
    thumbs.forEach((t) => t.classList.remove('is-selected'));
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  btn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      selectedRating = thumb.dataset.rating;
      thumbs.forEach((t) => t.classList.toggle('is-selected', t === thumb));
    });
  });

  submitBtn.addEventListener('click', async () => {
    const comment = commentBox.value.trim();
    if (!selectedRating && !comment) return; // nothing to send

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          comment,
          screen: document.querySelector('.screen:not(.hidden)')?.id || null,
        }),
      });
    } catch (err) {
      // fail quietly — feedback not landing shouldn't interrupt the tester
    }

    modal.querySelector('.feedback-modal-card > *:not(#feedback-thanks)').style.display = 'none';
    thanksMsg.classList.remove('hidden');
    setTimeout(closeModal, 1800);
  });
})();