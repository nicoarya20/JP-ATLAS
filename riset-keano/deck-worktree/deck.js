// Merender slide worktree dari window.WORKTREE dan menjalankan navigasi antar slide.
(function () {
  const LV_NAMA = { L1: "L1", L2: "L2", L3: "L3", S: "Sistem", N: "Nanti" };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const badge = (l) => {
    const b = el("span", "lv lv-" + l, LV_NAMA[l]);
    b.title = "Lapisan tampil";
    return b;
  };
  const hitung = (t) => t.modul.reduce((s, m) => s + m.fitur.length, 0);

  function renderOverview(data) {
    const box = document.getElementById("overview");
    if (!box) return;
    data.forEach((t) => {
      const tree = el("ul", "tree");
      const root = el("li");
      const head = el("a", "node-root");
      head.href = "#" + t.id;
      head.style.color = "inherit";
      head.append(el("span", "stage-tag", "Tahap " + t.no), el("span", null, t.nama), el("span", "mono", hitung(t) + " fitur"));
      const ul = el("ul");
      t.modul.forEach((m) => {
        const li = el("li");
        li.append(el("span", null, m.nama + " "), el("span", "mono muted", "(" + m.fitur.length + ")"));
        ul.append(li);
      });
      root.append(head, ul);
      tree.append(root);
      box.append(tree);
    });
  }

  function renderStage(t) {
    const sec = el("section", "slide");
    sec.id = t.id;
    const head = el("div", "slide-head");
    head.append(el("p", "eyebrow", "Tahap " + t.no + " · " + hitung(t) + " fitur"), el("h2", null, t.nama), el("p", "muted", t.ringkas));
    const mods = el("div", "modules");
    t.modul.forEach((m) => {
      const tree = el("ul", "tree");
      const root = el("li");
      const r = el("div", "node-root");
      r.append(el("span", null, m.nama), el("span", "mono", String(m.fitur.length)));
      const ul = el("ul");
      m.fitur.forEach((f) => {
        const li = el("li", "feat");
        const top = el("div", "feat-top");
        top.append(el("span", "feat-name", f.n), badge(f.l));
        const was = el("div", "mono feat-was", "ClickUp: ");
        was.append(el("b", null, f.c));
        li.append(top, was, el("p", "feat-desc", f.d));
        ul.append(li);
      });
      root.append(r, ul);
      tree.append(root);
      mods.append(tree);
    });
    sec.append(head, mods);
    return sec;
  }

  function renderStages(data) {
    const anchor = document.getElementById("stages");
    if (!anchor) return;
    data.forEach((t) => anchor.before(renderStage(t)));
    anchor.remove();
  }

  function setupNav() {
    const slides = Array.from(document.querySelectorAll(".slide"));
    const count = document.getElementById("count");
    let current = 0;
    const show = () => { count.textContent = String(current + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0"); };
    const go = (i) => {
      current = Math.max(0, Math.min(slides.length - 1, i));
      slides[current].scrollIntoView({ block: "start" });
      show();
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { current = slides.indexOf(e.target); show(); } });
    }, { threshold: 0.5 });
    slides.forEach((s) => io.observe(s));
    document.getElementById("prev").addEventListener("click", () => go(current - 1));
    document.getElementById("next").addEventListener("click", () => go(current + 1));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      const next = ["ArrowRight", "PageDown"], prev = ["ArrowLeft", "PageUp"];
      if (next.includes(e.key)) { e.preventDefault(); go(current + 1); }
      else if (prev.includes(e.key)) { e.preventDefault(); go(current - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(slides.length - 1); }
    });
    show();
  }

  if (!Array.isArray(window.WORKTREE)) {
    throw new Error("Data worktree tidak termuat: pastikan fitur.data.js ada di folder yang sama dengan index.html");
  }
  renderOverview(window.WORKTREE);
  renderStages(window.WORKTREE);
  setupNav();
})();
