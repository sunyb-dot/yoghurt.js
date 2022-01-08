`use strict`;

console.time(`Yoghurt Loaded`);

/* -------------------------------------------------------------------------- */
/*                                 ENVIRONMENT                                */
/* -------------------------------------------------------------------------- */

var yoghurt = new Object();

yoghurt.debug = window.env === `development` && {};
yoghurt.debug.verbose = false;
yoghurt.magnet = 7;

yoghurt.yoghurts = new Map();
yoghurt.clipboard = new Array();

yoghurt.observer = new ResizeObserver((entries) => {
  if (yoghurt.debug) console.log(this, entries);

  for (let entry of entries) {
    const it = yoghurt.yoghurts.get(entry.target);
    if (it && getComputedStyle(it.element).getPropertyValue(`position`) === `static`) {
      const rect = it.element.getBoundingClientRect();
      [`width`, `height`, `left`, `top`].forEach((name) => it.shadow.style.setProperty(name, `${rect[name]}px`));
    }
  }
});

yoghurt.onmousedown = window.onmousedown = function (event) {
  if (yoghurt.debug) console.log(this, event);

  const unfocus = (it) => it !== this && it.dispatch(new yoghurt.FocusEvent(false), `focused`, false);
  yoghurt.yoghurts.forEach(unfocus);

  const edited = (it) => it !== this && it.dispatch(new yoghurt.EditEvent(false), `editing`, false);
  yoghurt.yoghurts.forEach(edited);
};

yoghurt.onkeydown = window.onkeydown = function (event) {
  if (yoghurt.debug) console.log(this, event);

  switch (event.key) {
    case `Backspace`: // delete
      yoghurt.yoghurts.forEach((it) => it.status?.focused && (yoghurt.drop(it.element), it.element.remove()));
      break;

    case `c`: // copy
      if (event.metaKey)
        yoghurt.clipboard = Array.from(yoghurt.yoghurts).filter(([_element, it]) => it.status?.focused);
      break;

    case `v`: // paste
      if (event.metaKey) {
        const hosts = Array.from(yoghurt.yoghurts).filter(([_element, it]) => it.status?.focused);
        yoghurt.clipboard.forEach(([element]) => yoghurt.leave(element));
        const temp = new DocumentFragment();
        yoghurt.clipboard.forEach(([element]) => temp.appendChild(element.cloneNode(true)));
        hosts.forEach(([element]) => yoghurt.enter(element.append(temp.cloneNode(true))));
        yoghurt.clipboard.forEach(([element]) => yoghurt.enter(element));
      }
      break;
  }
};

/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

yoghurt.take = function (element) {
  if (!yoghurt.yoghurts.has(element))
    // prettier-ignore
    switch (element.tagName) {
      case `DIV` : case `SPAN`: case `PRE` : case `P`   :
      case `H1`  : case `H2`  : case `H3`  : case `H4`  : case `H5`  : case `H6`  :
      case `A`   : case `B`   : case `I`   :
        return new yoghurt.yoghurtEditorText(element);
    }
};

yoghurt.drop = function (element) {
  if (yoghurt.yoghurts.has(element)) return yoghurt.yoghurts.get(element).destructor();
};

yoghurt.enter = function (element = document.body) {
  const acceptNode = (node) => !node.classList.contains(`yoghurt`);
  const it = document.createNodeIterator(element, NodeFilter.SHOW_ELEMENT, { acceptNode });
  for (let node = it.nextNode(); node !== null; node = it.nextNode()) yoghurt.take(node);
};

yoghurt.leave = function (element = document.body) {
  const it = document.createNodeIterator(element, NodeFilter.SHOW_ELEMENT);
  for (let node = it.nextNode(); node !== null; node = it.nextNode()) yoghurt.drop(node);
};

/* -------------------------------------------------------------------------- */
/*                                   EVENTS                                   */
/* -------------------------------------------------------------------------- */

yoghurt.FocusEvent = class extends CustomEvent {
  constructor(focused) {
    super(`yoghurt${focused ? `` : `un`}focused`);
  }
};

yoghurt.EditEvent = class extends CustomEvent {
  constructor(editing) {
    super(`yoghurtedit${editing ? `` : `ed`}`);
  }
};

yoghurt.SelectEvent = class extends CustomEvent {
  constructor(range) {
    super(`yoghurtselect`, { detail: range });
  }
};

yoghurt.AlignEvent = class extends CustomEvent {
  constructor(aligned, direction, node) {
    super(`yoghurt${aligned ? `` : `un`}align`, { detail: { direction, node } });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   YOGHURT                                  */
/* -------------------------------------------------------------------------- */

yoghurt.Yoghurt = class {
  get parent() {
    return yoghurt.yoghurts.get(this.element.parentElement);
  }

  set(name, value) {
    const property = this.element.style.getPropertyValue(name);
    const [_match, unit] = property.match(/(%|px)$/) ?? [];
    switch (unit) {
      case `%`:
        this.element.style.setProperty(name, `1${unit}`);
        const scale = parseFloat(getComputedStyle(this.element).getPropertyValue(name));
        this.element.style.setProperty(name, `${value / scale}${unit}`);
        break;

      default:
        this.element.style.setProperty(name, `${value}px`);
        break;
    }
  }

  dispatch(event, check, value) {
    if (value === undefined || this.status?.[check] !== value) this.shadow.dispatchEvent(event);
  }

  listen(type, element = this.shadow) {
    this.unlisten(type, element);

    const listener = this[`on${type}`].bind(this);
    element.addEventListener(type, listener);

    this[`${type}Listener`] ||= new Map();
    this[`${type}Listener`].set(element, listener);
  }

  unlisten(type, element = this.shadow) {
    if (!(this[`${type}Listener`] instanceof Map)) return;

    const listener = this[`${type}Listener`].get(element);
    element.removeEventListener(type, listener);

    this[`${type}Listener`].delete(element);
  }

  constructor(element) {
    if (yoghurt.debug?.verbose) console.log(element);

    yoghurt.yoghurts.set(element, this);

    const shadow = document.createElement(`div`);
    shadow.classList.add(`yoghurt`);
    element.prepend(shadow);

    Object.assign(this, { element, shadow, status: {} });

    this.listen(`mousedown`);
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.log(this, this.element);

    yoghurt.yoghurts.delete(this.element, this);

    this.shadow.remove();

    this.unlisten(`mousedown`);
  }

  onmousedown(event) {
    event.stopPropagation(), event.preventDefault();
    yoghurt.onmousedown.call(this, event);

    if (yoghurt.debug) console.log(this, event);

    const { pageX, pageY } = event;
    Object.assign(this, { offsetX: parseFloat(getComputedStyle(this.element).getPropertyValue(`left`)) - pageX });
    Object.assign(this, { offsetY: parseFloat(getComputedStyle(this.element).getPropertyValue(`top`)) - pageY });

    this.listen(`mousemove`, document);
    this.listen(`mouseup`, document);
  }

  onmousemove(event) {
    if (yoghurt.debug?.verbose) console.log(this, event);

    if (!this.shadow.hasAttribute(`fixed-x`)) this.set(`left`, event.pageX + this.offsetX);
    if (!this.shadow.hasAttribute(`fixed-y`)) this.set(`top`, event.pageY + this.offsetY);
  }

  onmouseup(event) {
    if (yoghurt.debug) console.log(this, event);

    this.unlisten(`mousemove`, document);
    this.unlisten(`mouseup`, document);
  }
};

yoghurt.yoghurtAdjuster = class extends yoghurt.Yoghurt {
  constructor(element, index) {
    super(element);

    this.shadow.classList.add(`yoghurt-adjuster`, `yoghurt-adjuster-${index}`);
    if (index.endsWith(`m`)) this.shadow.setAttribute(`fixed-x`, ``);
    if (index.startsWith(`m`)) this.shadow.setAttribute(`fixed-y`, ``);

    const sign = { t: -1, l: -1, m: 0, b: 1, r: 1 };
    Object.assign(this, { index, sign: Array.from(index).map((c) => sign[c]) });
  }

  destructor() {
    super.destructor();
  }

  onmousedown(event) {
    super.onmousedown(event), this.parent.onmousedown(event);

    const { pageX, pageY } = event;
    Object.assign(this, {
      offsetW: parseFloat(getComputedStyle(this.element).getPropertyValue(`width`)) - pageX * this.sign[1],
      offsetH: parseFloat(getComputedStyle(this.element).getPropertyValue(`height`)) - pageY * this.sign[0],
    });

    if (!this.index.endsWith(`l`)) this.parent.shadow.setAttribute(`fixed-x`, ``);
    if (!this.index.startsWith(`t`)) this.parent.shadow.setAttribute(`fixed-y`, ``);

    this.shadow.style.setProperty(`--adjuster-display`, `block`);

    this.parent.dispatch(new yoghurt.EditEvent(false), `editing`, false);
  }

  onmousemove(event) {
    super.onmousemove(event);

    if (!this.element.hasAttribute(`fixed-w`)) this.parent.set(`width`, event.pageX * this.sign[1] + this.offsetW);
    if (!this.element.hasAttribute(`fixed-h`)) this.parent.set(`height`, event.pageY * this.sign[0] + this.offsetH);

    this.element.style.setProperty(`left`, ``);
    this.element.style.setProperty(`top`, ``);
  }

  onmouseup(event) {
    super.onmouseup(event);

    this.parent.shadow.removeAttribute(`fixed-x`);
    this.parent.shadow.removeAttribute(`fixed-y`);

    this.shadow.style.setProperty(`--adjuster-display`, ``);
    this.parent.dispatch(new yoghurt.FocusEvent(true), `focused`, true);
  }
};

yoghurt.yoghurtBlock = class extends yoghurt.Yoghurt {
  constructor(element) {
    super(element);

    if (getComputedStyle(element).getPropertyValue(`position`) === `static`) yoghurt.observer.observe(element);

    Object.assign(this, { adjusters: [], auxiliary: {}, horizontal: {}, vertical: {} });
    Object.assign(this.status, { focused: false, mousemove: false });

    this.listen(`yoghurtfocused`);
    this.listen(`yoghurtunfocused`);
    this.listen(`yoghurtalign`);
    this.listen(`yoghurtunalign`);
  }

  destructor() {
    super.destructor();

    yoghurt.observer.unobserve(this.element);

    this.unlisten(`yoghurtfocused`);
    this.unlisten(`yoghurtunfocused`);
    this.unlisten(`yoghurtalign`);
    this.unlisten(`yoghurtunalign`);
  }

  onmousedown(event) {
    super.onmousedown(event);

    const rootx = new yoghurt.Node(Infinity, undefined, this.horizontal);
    const rooty = new yoghurt.Node(Infinity, undefined, this.vertical);
    Object.assign(this.horizontal, { root: rootx });
    Object.assign(this.vertical, { root: rooty });

    const round = (x) => Math.round(x * 10) / 10;
    yoghurt.yoghurts.forEach((it, element) => {
      if (!element.classList.contains(`yoghurt`) && !this.element.contains(it.element)) {
        const rect = element.getBoundingClientRect();
        rootx.insert(round(rect.left), it), rootx.insert(round(rect.right), it);
        rooty.insert(round(rect.top), it), rooty.insert(round(rect.bottom), it);
      }
    });

    Object.assign(this.status, { mousemove: false });
    this.dispatch(new yoghurt.FocusEvent(!this.status.focused));
  }

  onmousemove(event) {
    super.onmousemove(event);

    const alignment = [
      [`horizontal`, `left`, `right`],
      [`vertical`, `top`, `bottom`],
    ];

    const rect = this.element.getBoundingClientRect();
    alignment.forEach(([direction, begin, end]) => {
      const { root } = this[direction];
      const [beginn, endn] = [root.near(rect[begin]), root.near(rect[end])];
      const [begind, endd] = [beginn.key - rect[begin], endn.key - rect[end]];
      const [begini, endi] = [`${begin}-${direction}`, `${end}-${direction}`];

      if (!event.metaKey && Math.abs(begind) <= Math.abs(endd) && Math.abs(begind) < yoghurt.magnet) {
        this.set(begin, parseFloat(getComputedStyle(this.element).getPropertyValue(begin)) + begind);
        this.dispatch(new yoghurt.AlignEvent(true, begini, beginn), begini, beginn.key);
      } else this.dispatch(new yoghurt.AlignEvent(false, begini, beginn), begini, null);

      if (!event.metaKey && Math.abs(endd) <= Math.abs(begind) && Math.abs(endd) < yoghurt.magnet) {
        this.set(begin, parseFloat(getComputedStyle(this.element).getPropertyValue(begin)) + endd);
        this.dispatch(new yoghurt.AlignEvent(true, endi, endn), endi, endn.key);
      } else this.dispatch(new yoghurt.AlignEvent(false, endi, endn), endi, null);
    });

    Object.assign(this.status, { mousemove: true });
    this.dispatch(new yoghurt.FocusEvent(false), `focused`, false);
  }

  onmouseup(event) {
    super.onmouseup(event);

    Object.assign(this, { horizontal: {}, vertical: {} }); // garbage
    if (this.status.mousemove) this.dispatch(new yoghurt.FocusEvent(true), `focused`, true);
    this.dispatch(new yoghurt.AlignEvent(false, `left-horizontal`), `left-horizontal`, null);
    this.dispatch(new yoghurt.AlignEvent(false, `right-horizontal`), `right-horizontal`, null);
    this.dispatch(new yoghurt.AlignEvent(false, `top-vertical`), `top-vertical`, null);
    this.dispatch(new yoghurt.AlignEvent(false, `bottom-vertical`), `bottom-vertical`, null);
  }

  onyoghurtfocused(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { focused: true });

    this.shadow.style.setProperty(`--adjuster-display`, `block`);
    this.shadow.style.setProperty(`--border-color`, `var(--color-focused)`);

    this.adjusters.forEach((adjuster) => adjuster.destructor()), Object.assign(this, { adjusters: [] });
    this.adjusters = [`tl`, `tm`, `tr`, `ml`, `mr`, `bl`, `bm`, `br`].map(
      (index) => new yoghurt.yoghurtAdjuster(this.shadow, index)
    );
  }

  onyoghurtunfocused(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { focused: false });

    this.shadow.style.setProperty(`--adjuster-display`, `none`);
    this.shadow.style.setProperty(`--border-color`, `var(--color-unfocused)`);

    this.adjusters.forEach((adjuster) => adjuster.destructor()), Object.assign(this, { adjusters: [] });
  }

  onyoghurtalign(event) {
    if (yoghurt.debug) console.log(this, event);
    const { direction, node } = event.detail;
    Object.assign(this.status, { [direction]: node.key });

    const [tag, type] = direction.split(`-`);
    this.auxiliary[tag]?.remove();

    const auxiliary = document.createElement(`div`);
    auxiliary.classList.add(`yoghurt`, `yoghurt-auxiliary`, `yoghurt-auxiliary-${type}`);
    auxiliary.style.setProperty(`--coordinate`, `${node.key}px`);
    document.body.appendChild(auxiliary);
    this.auxiliary[tag] = auxiliary;
  }

  onyoghurtunalign(event) {
    if (yoghurt.debug) console.log(this, event);
    const { direction, node } = event.detail;
    Object.assign(this.status, { [direction]: null });

    const [tag, type] = direction.split(`-`);
    this.auxiliary[tag]?.remove();
  }
};

yoghurt.yoghurtEditor = class extends yoghurt.yoghurtBlock {
  constructor(element) {
    super(element);

    Object.assign(this.status, { editing: false });

    this.listen(`dblclick`);
    this.listen(`yoghurtedit`);
    this.listen(`yoghurtedited`);
  }

  destructor() {
    super.destructor();

    this.unlisten(`dblclick`);
    this.unlisten(`yoghurtedit`);
    this.unlisten(`yoghurtedited`);
  }

  onmousedown(event) {
    if (!this.status.editing) return super.onmousedown(event);

    event.stopPropagation();

    if (yoghurt.debug) console.log(this, event);
  }

  ondblclick(event) {
    event.stopPropagation(), event.preventDefault();

    if (yoghurt.debug) console.log(this, event);

    this.dispatch(new yoghurt.EditEvent(!this.status.editing));
  }

  onkeydown(event) {
    if (yoghurt.debug) console.log(this, event);
  }

  onyoghurtedit(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { editing: true });

    this.shadow.style.setProperty(`display`, `none`);

    this.unlisten(`mousedown`);
    this.listen(`mousedown`, this.element);
    this.listen(`keydown`, document);
  }

  onyoghurtedited(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { editing: false });

    this.shadow.style.setProperty(`display`, ``);

    this.unlisten(`mousedown`, this.element);
    this.unlisten(`keydown`, document);
    this.listen(`mousedown`);

    this.dispatch(new yoghurt.FocusEvent(true), `focused`, true);
  }
};

yoghurt.yoghurtEditorText = class extends yoghurt.yoghurtEditor {
  onmousedown(event) {
    super.onmousedown(event);

    this.listen(`mouseup`, document);
  }

  onmouseup(event) {
    if (!this.status.editing) return super.onmouseup(event);

    if (yoghurt.debug) console.log(this, event);

    const selections = window.getSelection();
    for (let index = 0; index < selections.rangeCount; index++)
      this.dispatch(new yoghurt.SelectEvent(selections.getRangeAt(index))); // TODO: check contains

    this.unlisten(`mouseup`, document);
  }

  onyoghurtedit(event) {
    super.onyoghurtedit(event);

    this.element.setAttribute(`contenteditable`, ``);
    this.element.focus();

    this.listen(`yoghurtselect`);
  }

  onyoghurtedited(event) {
    super.onyoghurtedited(event);

    this.element.removeAttribute(`contenteditable`);
    this.element.blur();

    window.getSelection().removeAllRanges();

    this.unlisten(`yoghurtselect`);
  }

  onyoghurtselect(event) {
    if (yoghurt.debug) console.log(this, event);
  }
};

/* -------------------------------------------------------------------------- */
/*                                  STRUCTURE                                 */
/* -------------------------------------------------------------------------- */

yoghurt.Node = class {
  get(pos) {
    return this[`_${pos}`];
  }
  set(pos, node) {
    if (node) Object.assign(node, { parent: this, pos });
    return (this[`_${pos}`] = node);
  }

  dump() {
    return { key: this.key, value: this.value, left: this.get(`left`)?.dump(), right: this.get(`right`)?.dump() };
  }

  constructor(key, value, tree) {
    Object.assign(this, { key, value: new Set([value]), tree });
  }

  rotate(from, to = { left: `right`, right: `left` }[from]) {
    const node = this.get(from);
    if (this.tree.root === this) delete (this.tree.root = node).parent;
    else this.parent.set(this.pos, node);
    this.set(from, node.get(to)), node.set(to, this);
  }

  splay() {
    for (; this !== this.tree.root; ) {
      if (this.parent === this.tree.root) this.parent.rotate(this.pos);
      else {
        if (this.pos === this.parent.pos) this.parent.parent.rotate(this.parent.pos);
        else this.parent.rotate(this.pos);
        this.parent.rotate(this.pos);
      }
    }
    return this;
  }

  find(key) {
    if (key === this.key) return this;
    if (key < this.key) return this.get(`left`) ? this.get(`left`).find(key) : this;
    if (key > this.key) return this.get(`right`) ? this.get(`right`).find(key) : this;
  }

  near(key) {
    const rela = this.tree.root.find(key).splay();
    if (key === rela.key) return rela;
    if (key < rela.key) {
      const left = rela.get(`left`) && rela.get(`left`).most(`right`);
      return left && key - left.key < rela.key - key ? left : rela;
    }
    if (key > rela.key) {
      const right = rela.get(`right`) && rela.get(`right`).most(`left`);
      return right && right.key - key < key - rela.key ? right : rela;
    }
  }

  most(pos) {
    return this.get(pos) ? this.get(pos).most(pos) : this;
  }

  insert(key, value) {
    const parent = this.tree.root.find(key);
    if (key === parent.key) parent.splay().value.add(value);
    else {
      const child = new yoghurt.Node(key, value, this.tree);
      if (key < parent.key) parent.set(`left`, child);
      if (key > parent.key) parent.set(`right`, child);
      child.splay();
    }
  }

  delete(key, value, pos = `left`, opposite = { left: `right`, right: `left` }[pos]) {
    const node = this.tree.root.find(key).splay();
    if (key === node.key && node.value.delete(value) && node.value.size === 0) {
      if (!node.get(pos)) delete (this.tree.root = node.get(opposite)).parent;
      else {
        const leaf = node.get(pos).most(opposite);
        if (leaf.parent !== node) leaf.parent.set(leaf.pos, leaf.get(pos));
        leaf.set(`left`, node.get(`left`) !== leaf && node.get(`left`));
        leaf.set(`right`, node.get(`right`) !== leaf && node.get(`right`));
        delete (this.tree.root = leaf).parent;
      }
    }
  }
};

/* ------------------------------ END OF SCRIPT ----------------------------- */

console.timeEnd(`Yoghurt Loaded`);
