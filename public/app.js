const tasks = document.querySelector('#tasks');
if (tasks) {
  const status = document.querySelector('#task-status');
  function render(rows) {
    tasks.replaceChildren();
    document.querySelector('#progress').textContent = `${rows.filter(row => row.done).length} / ${rows.length} complete`;
    for (const row of rows) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = Boolean(row.done);
      const title = document.createElement('span'); title.textContent = row.title;
      input.addEventListener('change', async () => {
        input.disabled = true;
        try { await update({ id: row.id, done: input.checked }); status.textContent = 'Checklist saved.'; }
        catch (error) { input.checked = !input.checked; input.disabled = false; status.textContent = error.message; }
      });
      label.append(input, title); li.append(label); tasks.append(li);
    }
  }
  async function update(data) {
    const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to save task.');
    render(result.tasks);
  }
  document.querySelector('#task-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.querySelector('#task-title');
    const button = event.target.querySelector('button'); button.disabled = true;
    try { await update({ title: input.value }); input.value = ''; status.textContent = 'Task added and saved locally.'; input.focus(); }
    catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  fetch('/api/tasks').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(result => render(result.tasks)).catch(() => { status.textContent = 'Unable to load checklist. Refresh to retry.'; });
}
