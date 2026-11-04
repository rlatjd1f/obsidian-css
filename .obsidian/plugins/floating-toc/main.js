/*
 * Floating TOC
 *
 * 문서 영역 오른쪽에 목차를 항상 표시한다. 읽기·편집 모드 공통이고, 창을 분할하면 칸마다 따로 뜬다.
 * 제목 목록은 Obsidian 이 파싱해 둔 metadataCache 를 쓰고, 모양은 mystyle.css 에서 정한다.
 * 목차를 띄우는 칸의 .view-content 에 .has-floating-toc 를 붙여 본문과 겹치지 않게 자리를 비운다.
 */
const { Plugin, MarkdownView } = require("obsidian");

// 이보다 좁은 칸에서는 본문이 너무 좁아지므로 목차를 숨긴다.
const MIN_PANE_WIDTH = 700;
// 클릭으로 이동한 직후의 스크롤 이벤트는 강조 계산에서 무시한다.
// 문서 끝쪽 제목은 맨 위까지 올라오지 못해, 계산하면 클릭한 제목이 아닌 다른 제목이 강조된다.
const CLICK_HOLD_MS = 500;

/** 제목의 마크다운 표기를 벗긴다. 식별자에 흔한 _ 는 건드리지 않는다. */
function cleanHeading(text) {
  return text
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`|==|~~/g, "")
    .trim();
}

/** metadataCache 의 headings 를 표시용 항목으로 바꾼다. depth 는 문서 내 가장 큰 제목 기준 0부터. */
function buildItems(headings) {
  if (!headings || headings.length === 0) return [];
  const top = Math.min(...headings.map((h) => h.level));
  return headings.map((h) => ({
    text: cleanHeading(h.heading),
    depth: h.level - top,
    line: h.position.start.line,
  }));
}

/** 현재 스크롤 줄에서 읽고 있는 제목의 위치. 첫 제목보다 위면 -1. */
function activeIndex(items, scrollLine) {
  let found = -1;
  for (let i = 0; i < items.length; i++) {
    if (items[i].line > scrollLine + 0.5) break;
    found = i;
  }
  return found;
}

/** 칸(MarkdownView) 하나에 붙는 목차. */
class Toc {
  constructor(view) {
    this.view = view;
    this.items = [];
    this.links = [];
    this.heldUntil = 0;
    this.frame = 0;

    this.el = document.createElement("nav");
    this.el.className = "floating-toc";
    this.el.setAttribute("aria-label", "목차");
    view.contentEl.appendChild(this.el);

    this.onScroll = () => {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        if (Date.now() >= this.heldUntil) this.highlight();
      });
    };
    // 읽기·편집 모드의 스크롤 요소가 서로 다르므로 캡처로 한 번에 받는다.
    view.contentEl.addEventListener("scroll", this.onScroll, true);

    this.resizeObserver = new ResizeObserver(() => this.updateVisibility());
    this.resizeObserver.observe(view.contentEl);
  }

  /** 지금 칸에 열린 파일 기준으로 목록을 다시 그린다. */
  render(app) {
    const file = this.view.file;
    const cache = file ? app.metadataCache.getFileCache(file) : null;
    this.items = buildItems(cache && cache.headings);

    this.el.replaceChildren();
    this.links = this.items.map((item) => {
      const link = document.createElement("a");
      link.className = "floating-toc-item";
      link.dataset.depth = String(item.depth);
      link.style.setProperty("--toc-depth", String(item.depth));
      link.textContent = item.text;
      link.title = item.text;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.jumpTo(item);
      });
      this.el.appendChild(link);
      return link;
    });

    this.updateVisibility();
    this.highlight();
  }

  jumpTo(item) {
    this.heldUntil = Date.now() + CLICK_HOLD_MS;
    this.view.currentMode.applyScroll(item.line);
    this.setActive(this.items.indexOf(item));
  }

  highlight() {
    if (this.items.length === 0) return;
    this.setActive(activeIndex(this.items, this.view.currentMode.getScroll()));
  }

  setActive(index) {
    this.links.forEach((link, i) => link.classList.toggle("is-active", i === index));
    const active = this.links[index];
    if (!active) return;
    // 목차가 길면 강조된 항목이 목차 칸 안에 보이도록 목차만 스크롤한다. (본문은 움직이지 않는다)
    const box = this.el.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    if (rect.top < box.top) this.el.scrollTop -= box.top - rect.top;
    else if (rect.bottom > box.bottom) this.el.scrollTop += rect.bottom - box.bottom;
  }

  updateVisibility() {
    const show = this.items.length > 0 && this.view.contentEl.clientWidth >= MIN_PANE_WIDTH;
    this.view.contentEl.classList.toggle("has-floating-toc", show);
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.view.contentEl.removeEventListener("scroll", this.onScroll, true);
    this.view.contentEl.classList.remove("has-floating-toc");
    this.el.remove();
  }
}

module.exports = class FloatingToc extends Plugin {
  onload() {
    this.tocs = new Map();

    const sync = () => this.syncAll();
    this.registerEvent(this.app.workspace.on("layout-change", sync));
    this.registerEvent(this.app.workspace.on("file-open", sync));
    this.registerEvent(this.app.workspace.on("active-leaf-change", sync));
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        for (const [view, toc] of this.tocs) if (view.file === file) toc.render(this.app);
      })
    );
    this.app.workspace.onLayoutReady(sync);
  }

  /** 열린 Markdown 칸마다 목차를 맞춘다. 닫힌 칸의 목차는 정리한다. */
  syncAll() {
    const views = new Set();
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) views.add(leaf.view);
    });

    for (const [view, toc] of this.tocs) {
      if (!views.has(view)) {
        toc.destroy();
        this.tocs.delete(view);
      }
    }
    for (const view of views) {
      if (!this.tocs.has(view)) this.tocs.set(view, new Toc(view));
      this.tocs.get(view).render(this.app);
    }
  }

  onunload() {
    for (const toc of this.tocs.values()) toc.destroy();
    this.tocs.clear();
  }
};

// 테스트용 (Obsidian 밖에서 require 할 때만 쓰인다)
module.exports.__test = { cleanHeading, buildItems, activeIndex, Toc, MIN_PANE_WIDTH };
