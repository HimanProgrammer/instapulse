// ✏️ Edit these three lines with the details on your Udyam certificate, then commit.
window.LEGAL = {
  business: 'InstaPulse',          // legal business name as on Udyam
  location: 'Maharashtra, India',  // city, state
  email: 'hb.19editor@gmail.com',  // contact e-mail shown to users and Meta
  updated: '13 November 2026',
};
document.querySelectorAll('[data-l]').forEach((el) => {
  const v = window.LEGAL[el.dataset.l];
  el.textContent = v || '(contact e-mail – set in legal/site.js)';
  if (el.dataset.l === 'email' && v) el.innerHTML = `<a href="mailto:${v}">${v}</a>`;
});
