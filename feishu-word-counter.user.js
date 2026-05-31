// ==UserScript==
// @name         Feishu Docs Live Word Counter
// @namespace    https://github.com/mr-wuliu/feishu-docs-live-word-counter
// @version      0.1.3
// @description  在飞书文档编辑页面右下角实时显示当前文档字数。
// @author       mr-wuliu
// @homepageURL  https://github.com/mr-wuliu/feishu-docs-live-word-counter
// @supportURL   https://github.com/mr-wuliu/feishu-docs-live-word-counter/issues
// @icon         https://raw.githubusercontent.com/mr-wuliu/feishu-docs-live-word-counter/main/feishu.png
// @match        https://*.feishu.cn/docx/*
// @match        https://*.feishu.cn/docs/*
// @match        https://*.feishu.cn/wiki/*
// @match        https://*.larksuite.com/docx/*
// @match        https://*.larksuite.com/docs/*
// @match        https://*.larksuite.com/wiki/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const COUNTER_ID = 'feishu-live-word-counter';
  const POSITION_KEY = 'feishu-live-word-counter-position';
  const UPDATE_DELAY = 250;

  const editorSelectors = [
    '.page-block-children',
    '.root-render-unit-container',
    '.render-unit-wrapper',
    '[data-docx-editor]',
    '[data-testid*="editor"]',
    '[class*="docx-editor"]',
    '[class*="DocxEditor"]',
    '[class*="editor-content"]',
    '[class*="EditorContent"]',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"]',
  ];

  const ignoredSelectors = [
    'script',
    'style',
    'noscript',
    'svg',
    'canvas',
    'button',
    'input',
    'textarea',
    '[aria-hidden="true"]',
    '[contenteditable="false"]',
    '[class*="toolbar"]',
    '[class*="Toolbar"]',
    '[class*="menu"]',
    '[class*="Menu"]',
    '[class*="comment"]',
    '[class*="Comment"]',
    '[class*="side"]',
    '[class*="Side"]',
    '.suspension-comment-area',
    '.page-block-header',
    '.doc-info-swipe-container',
    '.doc-info-wrapper',
    '.doc-meta-entry-container',
    '.doc-meta-entry-wrapper',
    '.doc-custom-icon-entry',
    '.doc-cover-entry',
    '.bear-virtual-pre-renderer',
    'h1.page-block-content',
  ];

  const titleSelectors = [
    'h1',
    'h1.page-block-content',
    '.page-block-content.left',
    '[data-testid*="title" i]',
    '[data-test-id*="title" i]',
    '[data-placeholder*="标题"]',
    '[data-placeholder*="title" i]',
    '[placeholder*="标题"]',
    '[placeholder*="title" i]',
    '[aria-label*="标题"]',
    '[aria-label*="title" i]',
    '[class*="doc-title" i]',
    '[class*="document-title" i]',
    '[class*="title-input" i]',
  ];

  let observedEditor = null;
  let observer = null;
  let updateTimer = null;

  function createCounter() {
    const existing = document.getElementById(COUNTER_ID);
    if (existing) return existing;

    const counter = document.createElement('div');
    counter.id = COUNTER_ID;
    counter.textContent = '字数统计中...';
    counter.title = '飞书文档实时字数统计';
    counter.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:96px',
      'z-index:2147483647',
      'padding:8px 12px',
      'border:1px solid rgba(31,35,41,.14)',
      'border-radius:8px',
      'background:rgba(255,255,255,.94)',
      'box-shadow:0 6px 18px rgba(31,35,41,.12)',
      'color:#1f2329',
      'font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,"PingFang SC","Microsoft YaHei",sans-serif',
      'user-select:none',
      'pointer-events:auto',
      'cursor:move',
      'backdrop-filter:saturate(180%) blur(8px)',
    ].join(';');

    document.documentElement.appendChild(counter);
    restoreCounterPosition(counter);
    enableCounterDrag(counter);
    return counter;
  }

  function restoreCounterPosition(counter) {
    try {
      const savedPosition = JSON.parse(window.localStorage.getItem(POSITION_KEY) || 'null');
      if (!savedPosition || typeof savedPosition.left !== 'number' || typeof savedPosition.top !== 'number') {
        return;
      }

      counter.style.left = `${savedPosition.left}px`;
      counter.style.top = `${savedPosition.top}px`;
      counter.style.right = 'auto';
      counter.style.bottom = 'auto';
    } catch (_error) {
      window.localStorage.removeItem(POSITION_KEY);
    }
  }

  function enableCounterDrag(counter) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    counter.addEventListener('dblclick', () => {
      window.localStorage.removeItem(POSITION_KEY);
      counter.style.left = 'auto';
      counter.style.top = 'auto';
      counter.style.right = '20px';
      counter.style.bottom = '96px';
    });

    counter.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;

      const rect = counter.getBoundingClientRect();
      dragging = true;
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      counter.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    counter.addEventListener('pointermove', (event) => {
      if (!dragging) return;

      const maxLeft = window.innerWidth - counter.offsetWidth - 8;
      const maxTop = window.innerHeight - counter.offsetHeight - 8;
      const left = Math.max(8, Math.min(maxLeft, event.clientX - offsetX));
      const top = Math.max(8, Math.min(maxTop, event.clientY - offsetY));

      counter.style.left = `${left}px`;
      counter.style.top = `${top}px`;
      counter.style.right = 'auto';
      counter.style.bottom = 'auto';
    });

    counter.addEventListener('pointerup', (event) => {
      if (!dragging) return;

      dragging = false;
      counter.releasePointerCapture(event.pointerId);
      const rect = counter.getBoundingClientRect();
      window.localStorage.setItem(POSITION_KEY, JSON.stringify({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      }));
    });
  }

  function isVisibleElement(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function shouldIgnoreElement(element) {
    if (!(element instanceof Element)) return false;
    if (element.id === COUNTER_ID) return true;
    if (!isVisibleElement(element)) return true;
    return ignoredSelectors.some((selector) => element.matches(selector)) || isTitleElement(element);
  }

  function isTitleElement(element) {
    if (!(element instanceof Element)) return false;
    return titleSelectors.some((selector) => element.matches(selector));
  }

  function hasIgnoredAncestor(element, root) {
    let current = element;
    while (current && current !== root) {
      if (shouldIgnoreElement(current)) {
        return true;
      }

      current = current.parentElement;
    }

    return shouldIgnoreElement(root);
  }

  function collectText(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || hasIgnoredAncestor(parent, root)) {
            return NodeFilter.FILTER_REJECT;
          }

          return node.nodeValue && node.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
    );

    const chunks = [];
    let node = walker.nextNode();
    while (node) {
      chunks.push(node.nodeValue);
      node = walker.nextNode();
    }

    return chunks.join('\n');
  }

  function countWords(text) {
    const normalized = text
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return {
        total: 0,
        cjk: 0,
        words: 0,
        numbers: 0,
      };
    }

    const cjkMatches = normalized.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || [];
    const textWithoutCjk = normalized.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, ' ');
    const wordMatches = textWithoutCjk.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || [];
    const numberMatches = textWithoutCjk.match(/\d+(?:[.,]\d+)*/g) || [];

    return {
      total: cjkMatches.length + wordMatches.length + numberMatches.length,
      cjk: cjkMatches.length,
      words: wordMatches.length,
      numbers: numberMatches.length,
    };
  }

  function findEditor() {
    const bodyCandidates = editorSelectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element) => element instanceof HTMLElement)
      .filter((element) => isVisibleElement(element))
      .filter((element) => !isTitleElement(element))
      .map((element) => ({
        element,
        textLength: collectText(element).length,
        priority: getEditorPriority(element),
      }))
      .filter((candidate) => candidate.textLength > 0)
      .sort((a, b) => b.priority - a.priority || b.textLength - a.textLength);

    return bodyCandidates[0] ? bodyCandidates[0].element : document.body;
  }

  function getEditorPriority(element) {
    if (element.matches('.page-block-children')) return 100;
    if (element.matches('.root-render-unit-container')) return 90;
    if (element.matches('.render-unit-wrapper')) return 80;
    if (element.matches('[contenteditable="true"]')) return 20;
    return 10;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('zh-CN').format(value);
  }

  function updateCounter() {
    updateTimer = null;

    const counter = createCounter();
    const editor = findEditor();
    const text = collectText(editor);
    const count = countWords(text);

    counter.textContent = `字数 ${formatNumber(count.total)}`;
    counter.title = `飞书文档实时字数统计\n中文字符：${formatNumber(count.cjk)}\n英文单词：${formatNumber(count.words)}\n数字：${formatNumber(count.numbers)}`;

    if (editor !== observedEditor) {
      observeEditor(editor);
    }
  }

  function scheduleUpdate() {
    if (updateTimer) {
      window.clearTimeout(updateTimer);
    }

    updateTimer = window.setTimeout(updateCounter, UPDATE_DELAY);
  }

  function observeEditor(editor) {
    if (observer) {
      observer.disconnect();
    }

    observedEditor = editor;
    observer = new MutationObserver(scheduleUpdate);
    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'contenteditable'],
    });
  }

  function bindEvents() {
    document.addEventListener('input', scheduleUpdate, true);
    document.addEventListener('keyup', scheduleUpdate, true);
    document.addEventListener('paste', scheduleUpdate, true);
    document.addEventListener('cut', scheduleUpdate, true);
    document.addEventListener('compositionend', scheduleUpdate, true);
    window.addEventListener('hashchange', scheduleUpdate);
    window.addEventListener('popstate', scheduleUpdate);
  }

  bindEvents();
  scheduleUpdate();
  window.setInterval(scheduleUpdate, 3000);
})();
