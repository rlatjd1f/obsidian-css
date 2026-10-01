/*
 * Plain Code Comments
 *
 * 언어를 지정하지 않은 코드블록(``` 만 있는 블록)은 Prism(읽기 모드)도 CodeMirror(편집 모드)도
 * 문법 분석을 하지 않아 주석 표시(클래스)가 생기지 않는다. CSS 는 글자 내용을 읽을 수 없으므로
 * 여기서 // 부터 줄 끝까지에 .plain-code-comment 클래스를 붙이고, 색은 mystyle.css 에서 정한다.
 *
 * // 는 줄 맨 앞(들여쓰기 뒤)이거나 공백 바로 뒤에 올 때만 주석으로 본다.
 * http://example.com 처럼 다른 글자에 붙은 // 는 주석으로 보지 않는다.
 */
const { Plugin } = require("obsidian");
const { ViewPlugin, Decoration } = require("@codemirror/view");
const { RangeSetBuilder } = require("@codemirror/state");

const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const COMMENT = /(^|\s)(\/\/.*)$/;
const CLS = "plain-code-comment";

/** 한 줄에서 주석 구간 [시작, 끝) 을 돌려준다. 없으면 null. */
function commentRange(text) {
  const m = COMMENT.exec(text);
  if (!m) return null;
  return [m.index + m[1].length, text.length];
}

/** 펜스 줄이면 { marker, lang } 를, 아니면 null 을 돌려준다. */
function parseFence(text) {
  const f = FENCE.exec(text);
  return f ? { marker: f[1], lang: f[2].trim() } : null;
}

/** 여는 펜스를 닫는 줄인지: 같은 문자, 같거나 더 긴 길이, 뒤에 아무것도 없음. */
function closes(open, fence) {
  return (
    fence !== null &&
    fence.marker[0] === open.marker[0] &&
    fence.marker.length >= open.marker.length &&
    fence.lang === ""
  );
}

/* ---------- 편집 모드 (CodeMirror 6) ---------- */

const commentMark = Decoration.mark({ class: CLS });

function buildDecorations(view) {
  const builder = new RangeSetBuilder();
  const doc = view.state.doc;
  const { from, to } = view.viewport;
  let open = null;

  // 펜스 상태는 문서 처음부터 따라가야 알 수 있으므로 화면 끝까지 처음부터 훑는다.
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    if (line.from > to) break;
    const fence = parseFence(line.text);

    if (open === null) {
      if (fence) open = fence;
      continue;
    }
    if (closes(open, fence)) {
      open = null;
      continue;
    }
    if (open.lang === "" && line.to >= from) {
      const r = commentRange(line.text);
      if (r) builder.add(line.from + r[0], line.from + r[1], commentMark);
    }
  }
  return builder.finish();
}

const editorExtension = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

/* ---------- 읽기 모드 ---------- */

function decorateCodeElement(code) {
  // 언어가 지정된 블록은 Prism 이 처리하므로 건드리지 않는다.
  if ([...code.classList].some((c) => c.startsWith("language-"))) return;
  if (code.dataset.plainCodeComments === "done") return;

  const lines = code.textContent.split("\n");
  if (!lines.some((l) => commentRange(l))) return;

  // 언어 없는 블록은 내부가 순수 텍스트이므로 textContent 로 다시 짓는다.
  // textContent 는 그대로 유지되어 복사 버튼 결과도 바뀌지 않는다.
  const frag = document.createDocumentFragment();
  lines.forEach((l, i) => {
    const r = commentRange(l);
    if (r) {
      frag.append(document.createTextNode(l.slice(0, r[0])));
      const span = document.createElement("span");
      span.className = CLS;
      span.textContent = l.slice(r[0]);
      frag.append(span);
    } else {
      frag.append(document.createTextNode(l));
    }
    if (i < lines.length - 1) frag.append(document.createTextNode("\n"));
  });
  code.replaceChildren(frag);
  code.dataset.plainCodeComments = "done";
}

module.exports = class PlainCodeComments extends Plugin {
  onload() {
    this.registerEditorExtension(editorExtension);
    this.registerMarkdownPostProcessor((el) => {
      el.querySelectorAll("pre > code").forEach(decorateCodeElement);
    });
  }
};

// 테스트용 (Obsidian 밖에서 require 할 때만 쓰인다)
module.exports.__test = { commentRange, parseFence, closes, buildDecorations, decorateCodeElement, CLS };
