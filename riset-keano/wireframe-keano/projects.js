// Sidebar kedua menu Projects: daftar project dan list di dalamnya (nama hanya placeholder).
// Pilihan disimpan di hash (#projects/<project>/<urutan list>/<tampilan>) supaya bisa dibuka ulang lewat URL.
// Isi halaman (tab Channel/Overview/List/Kanban/Calendar/Gantt) digambar project.views.js lewat WF_PV.show.
(() => {
  const { esc } = window.WF_CARDS;
  const projects = ['p1', 'p2', 'p3'].map(id => ({ id, name: 'Project Name', lists: ['List Name', 'List Name'] }));
  const tree = document.getElementById('projectTree');
  const nav = document.getElementById('projectNav');
  // Project pertama terbuka supaya contoh list di dalamnya langsung terlihat
  const open = new Set(['p1']);
  let current = [];

  function render() {
    const [pid, li] = current;
    const row = (path, label, selected, extra = '') => `<div class="tree-row" ${selected ? 'aria-current="page"' : ''}>
      <button class="tree-item" data-path="${path}">${label}</button>${extra}</div>`;
    tree.innerHTML = row('', '<span class="ph-icon"></span><span class="ellipsis">All Tasks <span class="muted">· Workspace Name</span></span>', !pid) +
      projects.map(p => `<li>
        ${row(p.id, `<span class="p-avatar">${esc(p.name[0].toUpperCase())}</span><span class="ellipsis">${esc(p.name)}</span>`,
          pid === p.id && li === undefined,
          `<button class="tree-add" title="Add list to ${esc(p.name)}" aria-label="Add list">+</button>`)}
        ${open.has(p.id) ? `<ul>${p.lists.map((l, i) => `<li>${row(`${p.id}/${i}`,
          `<span class="ph-icon"></span><span class="ellipsis">${esc(l)}</span>`, pid === p.id && li === String(i))}</li>`).join('')}</ul>` : ''}
      </li>`).join('') +
      `<li><div class="tree-row"><button class="tree-item tree-new"><span class="p-avatar">+</span>New Project</button></div></li>`;
  }

  // Klik project = pilih + buka/tutup daftar list-nya; klik list = pilih list
  tree.addEventListener('click', e => {
    const item = e.target.closest('[data-path]');
    if (!item) return;
    const [pid, li] = item.dataset.path.split('/');
    if (pid && li === undefined) {
      const reselect = current[0] === pid && current[1] === undefined;
      if (open.has(pid) && reselect) open.delete(pid); else open.add(pid);
    }
    const target = item.dataset.path.split('/').filter(Boolean);
    // Tetap di tab yang sama (mis. Kanban) saat pindah project/list, bila tab itu ada di tujuan
    const view = window.WF_PV.keepView(!target.length ? 'all' : target.length > 1 ? 'list' : 'project');
    location.hash = ['#projects', ...target, ...(view ? [view] : [])].join('/');
    render();
  });

  // Dipanggil routing di index.html: tampilkan sidebar, tandai pilihan, kembalikan judul halaman
  function sync(path) {
    // Segmen terakhir boleh berupa nama tampilan (#projects/p1/kanban, #projects/p1/0/gantt)
    path = path.filter(Boolean);
    const view = window.WF_PV.VIEWS[path[path.length - 1]] ? path.pop() : null;
    const project = projects.find(p => p.id === path[0]);
    const list = project?.lists[path[1]];
    // Project baru dipilih (mis. dari URL) otomatis terbuka; klik ulang project yang sama menutupnya
    if (project && project.id !== current[0]) open.add(project.id);
    current = project ? (list !== undefined ? [project.id, path[1]] : [project.id]) : [];
    render();
    const scope = !project ? 'all' : list !== undefined ? 'list' : 'project';
    window.WF_PV.show({ scope, base: ['#projects', ...current], list: Number(current[1]), view });
    return project ? (list !== undefined ? `${project.name} / ${list}` : project.name) : 'All Tasks';
  }

  // nav ditampilkan/disembunyikan oleh routing di index.html
  window.WF_PROJECTS = { sync, nav };
})();
