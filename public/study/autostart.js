// Topic links on the course pages open /study/?topic=<id>. This loads that topic's slide text
// (public/materials, listed in topics.json) into the upload form and starts the session,
// using the same controls a student would, so app.js stays unchanged.
// "Mixed practice" links open /study/?topics=<id>,<id>,… and build one session from several briefs,
// so questions from different topics are interleaved. The upload form takes four files, so a longer
// list is sampled down to four.
const params = new URLSearchParams(location.search);
const topicIds = (params.get('topics') || params.get('topic') || '').split(',').filter(Boolean);
if (topicIds.length) startTopics(topicIds);

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

async function startTopics(ids) {
  history.replaceState(null, '', location.pathname); // a reload shouldn't start it again
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const picked = [];
  try {
    const topics = await (await fetch('/materials/topics.json')).json();
    for (const id of ids.slice(0, 4)) {
      const topic = topics[id], response = topic && await fetch(topic.file);
      if (response?.ok) picked.push({ topic, text: await response.text() });
    }
  } catch { /* handled below */ }
  if (!picked.length) return notice('The slides for that topic aren\'t available yet. Upload your own files instead.');
  const name = picked.length > 1 ? `a mixed session (${picked.map(p => p.topic.title).join(', ')})` : `"${picked[0].topic.title}"`;

  // A saved session shows the workspace instead of the upload form; ask before replacing it.
  if (!document.querySelector('#file-input')) {
    const isSample = document.querySelector('.sample-banner');
    if (!isSample && !confirm(`Start a new session for ${name}? It replaces the session saved in this browser; questions you already answered stay in Review. Download a backup in Settings first if you want to keep it.`)) return;
    document.querySelector('#new-material').click();
  }
  await connectionReady();
  const input = document.querySelector('#file-input');
  const files = new DataTransfer();
  for (const { topic, text } of picked) files.items.add(new File([text], `${topic.title} (${topic.section}).txt`, { type: 'text/plain' }));
  input.files = files.files;
  input.dispatchEvent(new Event('change'));
  document.querySelector('#build-study').click();
}
