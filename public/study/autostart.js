// Topic links on the course pages open /study/?topic=<id>. This loads that topic's slide text
// (public/materials, listed in topics.json) into the upload form and starts the session,
// using the same controls a student would, so app.js stays unchanged.
const topicId = new URLSearchParams(location.search).get('topic');
if (topicId) startTopic(topicId);

function notice(message) {
  const box = document.querySelector('#toast');
  box.textContent = message; box.hidden = false;
  setTimeout(() => { box.hidden = true; }, 6000);
}

// app.js fills the connection label once it knows whether AI and an access code are set up.
function connectionReady() {
  return new Promise(resolve => {
    const label = document.querySelector('#connection-label'), started = Date.now();
    const check = () => (label.textContent || Date.now() - started > 5000) ? resolve() : setTimeout(check, 100);
    check();
  });
}

async function startTopic(id) {
  history.replaceState(null, '', location.pathname); // a reload shouldn't start it again
  let topic, text;
  try {
    topic = (await (await fetch('/materials/topics.json')).json())[id];
    const response = topic && await fetch(topic.file);
    if (response?.ok) text = await response.text();
  } catch { /* handled below */ }
  if (!topic || !text) return notice('The slides for that topic aren\'t available yet. Upload your own files instead.');

  // A saved session shows the workspace instead of the upload form; ask before replacing it.
  if (!document.querySelector('#file-input')) {
    const isSample = document.querySelector('.sample-banner');
    if (!isSample && !confirm(`Start a new session for "${topic.title}"? It replaces the session saved in this browser. Download a backup in Settings first if you want to keep it.`)) return;
    document.querySelector('#new-material').click();
  }
  await connectionReady();
  const input = document.querySelector('#file-input');
  const files = new DataTransfer();
  files.items.add(new File([text], `${topic.title} (${topic.section}).txt`, { type: 'text/plain' }));
  input.files = files.files;
  input.dispatchEvent(new Event('change'));
  document.querySelector('#build-study').click();
}
