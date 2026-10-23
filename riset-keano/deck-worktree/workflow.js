// Menggambar setiap diagram di window.WORKFLOW dengan Mermaid memakai warna dari token CSS, lalu menggambar ulang saat tema berganti.
(function () {
  "use strict";

  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function classDefs() {
    const c = {
      deep: tok("--wf-deep"), blue: tok("--wf-blue"), soft: tok("--wf-soft"), softInk: tok("--wf-soft-ink"),
      tool: tok("--wf-tool"), toolInk: tok("--wf-tool-ink"), mark: tok("--mark"), surface: tok("--surface"), ink: tok("--ink")
    };
    return [
      `classDef default fill:${c.soft},stroke:${c.blue},stroke-width:1.5px,color:${c.softInk}`,
      `classDef term fill:${c.deep},stroke:${c.deep},color:#ffffff,font-weight:700`,
      `classDef main fill:${c.blue},stroke:${c.blue},color:#ffffff,font-weight:600`,
      `classDef dec fill:${c.surface},stroke:${c.blue},stroke-width:2px,color:${c.ink}`,
      `classDef sys fill:${c.soft},stroke:${c.blue},stroke-width:1.5px,stroke-dasharray:5 4,color:${c.softInk}`,
      `classDef tool fill:${c.tool},stroke:${c.mark},stroke-width:1.5px,color:${c.toolInk}`
    ].join("\n");
  }

  function configure() {
    mermaid.initialize({
      startOnLoad: false, theme: "base", securityLevel: "strict",
      flowchart: { curve: "basis", useMaxWidth: false, htmlLabels: true, wrappingWidth: 190, nodeSpacing: 34, rankSpacing: 44 },
      themeVariables: {
        fontFamily: tok("--f-body"), fontSize: "14px",
        lineColor: tok("--wf-edge"), textColor: tok("--ink"),
        edgeLabelBackground: tok("--surface"), primaryColor: tok("--wf-soft")
      }
    });
  }

  function renderShells(data, root) {
    const jump = document.getElementById("jump");
    data.forEach((d, i) => {
      const no = String(i + 1).padStart(2, "0");
      const a = el("a");
      a.href = "#" + d.id;
      a.append(el("span", "mono", no), document.createTextNode(d.judul));
      const li = el("li");
      li.append(a);
      jump.append(li);

      const sec = el("section", "chart");
      sec.id = d.id;
      const head = el("div", "chart-head");
      head.append(el("span", "eyebrow", `${no} · ${d.menu}`), el("h2", null, d.judul));
      const canvas = el("div", "canvas");
      canvas.append(el("p", "loading", "Menggambar diagram…"));
      sec.append(head, el("p", null, d.ket), canvas);
      root.append(sec);
    });
  }

  let pass = 0;
  async function drawAll(data) {
    const run = ++pass;
    configure();
    const defs = classDefs();
    for (const [i, d] of data.entries()) {
      const canvas = document.querySelector(`#${d.id} .canvas`);
      const code = `flowchart ${d.arah}\n${defs}\n${d.kode}`;
      try {
        const { svg } = await mermaid.render(`wf-${d.id}-${run}`, code);
        if (run !== pass) return;
        canvas.innerHTML = svg;
        canvas.querySelector("svg").setAttribute("aria-label", `Diagram alur: ${d.judul}`);
      } catch (err) {
        console.error(`Gagal menggambar diagram "${d.id}" (urutan ${i + 1}):`, err);
        canvas.replaceChildren(el("p", "error", `Diagram "${d.judul}" gagal digambar: ${err.message || err}`));
      }
    }
  }

  function watchTheme(data) {
    const redraw = () => drawAll(data);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  const data = window.WORKFLOW;
  if (!Array.isArray(data) || !data.length) throw new Error("window.WORKFLOW kosong: file workflow.diagrams-*.js belum dimuat sebelum workflow.js");
  if (typeof mermaid === "undefined") throw new Error("Mermaid belum termuat dari cdnjs; periksa koneksi internet");

  renderShells(data, document.getElementById("charts"));
  const start = () => drawAll(data).then(() => watchTheme(data));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
