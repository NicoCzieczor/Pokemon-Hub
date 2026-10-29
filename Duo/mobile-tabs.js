// Tabs der Handy-Ansicht von Duo (Teams, Box, Info, …)
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.m-tab-btn');
  const panels = document.querySelectorAll('.m-tab-panel');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Box-Tab: Box gleich aufklappen
      if (btn.dataset.tab === 'box') {
        const body = document.getElementById('box-body');
        if (body && body.style.display === 'none') {
          document.getElementById('box-toggle')?.click();
        }
      }
    });
  });
});
