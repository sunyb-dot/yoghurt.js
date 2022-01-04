`use strict`;

window.onload = () => yoghurt.enter();

console.time(`Yoghurt Loaded`);

/* -------------------------------------------------------------------------- */
/*                                 ENVIRONMENT                                */
/* -------------------------------------------------------------------------- */

var yoghurt = new Object();

yoghurt.debug = window?.env == `development` && {};
yoghurt.debug.verbose = false;
yoghurt.parent = document.currentScript?.parentNode;
yoghurt.yoghurts = new Map();

window.onmousedown = function (_event) {
  const unfocus = (it) => it.status?.focused && it !== this && it.element.dispatchEvent(new yoghurt.FocusEvent(false));
  yoghurt.yoghurts.forEach(unfocus);
};

/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

yoghurt.take = function (element) {
  if (!yoghurt.yoghurts.has(element))
    switch (element.tagName) {
      case `DIV`:
      case `SPAN`:
        return new yoghurt.yoghurtEditor(element);
    }
};

yoghurt.drop = function (element) {
  if (yoghurt.yoghurts.has(element)) return yoghurt.yoghurts.get(element).destructor();
};

yoghurt.enter = function (element = document.body) {
  const it = document.createNodeIterator(element, NodeFilter.SHOW_ELEMENT);
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

/* -------------------------------------------------------------------------- */
/*                                   YOGHURT                                  */
/* -------------------------------------------------------------------------- */

yoghurt.yoghurt = class {
  get parent() {
    return yoghurt.yoghurts.get(this.element.parentElement);
  }

  get(property, reference) {
    const display = this.element.style.getPropertyValue(`display`);
    this.element.style.setProperty(`display`, `block`);
    const style = this.element.style.getPropertyValue(reference);
    this.element.style.setProperty(reference, getComputedStyle(this.element).getPropertyValue(property));
    const value = getComputedStyle(this.element).getPropertyValue(reference);
    this.element.style.setProperty(reference, style);
    this.element.style.setProperty(`display`, display);
    return value;
  }

  listen(type, element = this.element) {
    this.unlisten(type, element); // in case of unpaired listen/un() !

    const listener = this[`on${type}`].bind(this);
    element.addEventListener(type, listener);
    this[`${type}Listener`] = listener;
  }

  unlisten(type, element = this.element) {
    const listener = this[`${type}Listener`];
    element.removeEventListener(type, listener);
    delete this[`${type}Listener`];
  }

  constructor(element) {
    if (yoghurt.debug?.verbose) console.log(element);

    Object.assign(this, { element });

    this.element.classList.add(`yoghurt`);
    yoghurt.yoghurts.set(element, this);

    this.listen(`mousedown`);
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.log(this, this.element);

    this.element.classList.remove(`yoghurt`);
    yoghurt.yoghurts.delete(this.element, this);

    this.unlisten(`mousedown`);
  }

  onmousedown(event) {
    event.stopPropagation(), event.preventDefault();
    window.onmousedown.call(this, event);

    if (yoghurt.debug) console.log(this, event);

    const { pageX, pageY } = event;
    Object.assign(this, {
      offsetX: parseFloat(this.get(`--l-px`, `left`)) - pageX,
      offsetY: parseFloat(this.get(`--t-px`, `top`)) - pageY,
    });

    this.listen(`mousemove`, document);
    this.listen(`mouseup`, document);
  }

  onmousemove(event) {
    if (yoghurt.debug?.verbose) console.log(this, event);

    if (!this.element.hasAttribute(`fixed-x`))
      this.element.style.setProperty(`--l`, (event.pageX + this.offsetX) / parseFloat(this.get(`--l-unit`, `left`)));
    if (!this.element.hasAttribute(`fixed-y`))
      this.element.style.setProperty(`--t`, (event.pageY + this.offsetY) / parseFloat(this.get(`--t-unit`, `top`)));
  }

  onmouseup(event) {
    if (yoghurt.debug) console.log(this, event);

    this.unlisten(`mousemove`, document);
    this.unlisten(`mouseup`, document);
  }
};

yoghurt.yoghurtAdjuster = class extends yoghurt.yoghurt {
  constructor(element, index) {
    if (yoghurt.debug?.verbose) console.log(element);
    super(element);

    Object.assign(this, { index });
    if (this.index.endsWith(`m`)) this.element.setAttribute(`fixed-x`, ``);
    if (this.index.startsWith(`m`)) this.element.setAttribute(`fixed-y`, ``);
    const sign = { t: -1, l: -1, m: 0, b: 1, r: 1 };
    Object.assign(this, { sign: Array.from(this.index).map((c) => sign[c]) });

    this.element.classList.add(`yoghurt-adjuster`, `yoghurt-adjuster-${this.index}`);
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.log(this, this.element);

    this.element.remove();
  }

  onmousedown(event) {
    super.onmousedown(event), setTimeout(() => this.parent.onmousedown(event));

    const { pageX, pageY } = event;
    Object.assign(this, {
      offsetW: parseFloat(this.parent.get(`--w-px`, `left`)) - pageX * this.sign[1],
      offsetH: parseFloat(this.parent.get(`--h-px`, `top`)) - pageY * this.sign[0],
    });

    this.element.style.setProperty(`--adjuster-display`, `block`);
    if (!this.index.endsWith(`l`)) this.parent.element.setAttribute(`fixed-x`, ``);
    if (!this.index.startsWith(`t`)) this.parent.element.setAttribute(`fixed-y`, ``);

    this.parent.element.dispatchEvent(new yoghurt.EditEvent(false)); // BUG?
  }

  onmousemove(event) {
    super.onmousemove(event);

    const [width, height] = [event.pageX * this.sign[1] + this.offsetW, event.pageY * this.sign[0] + this.offsetH];
    if (!this.element.hasAttribute(`fixed-w`))
      this.parent.element.style.setProperty(`--w`, width / parseFloat(this.parent.get(`--w-unit`, `left`)));
    if (!this.element.hasAttribute(`fixed-h`))
      this.parent.element.style.setProperty(`--h`, height / parseFloat(this.parent.get(`--h-unit`, `top`)));

    this.element.style.setProperty(`--l`, ``);
    this.element.style.setProperty(`--t`, ``);
  }

  onmouseup(event) {
    super.onmouseup(event);

    this.element.style.setProperty(`--adjuster-display`, ``);
    this.parent.element.removeAttribute(`fixed-x`);
    this.parent.element.removeAttribute(`fixed-y`);
    this.parent.element.dispatchEvent(new yoghurt.FocusEvent(true));
  }
};

yoghurt.yoghurtBlock = class extends yoghurt.yoghurt {
  constructor(element) {
    super(element);

    Object.assign(this, { status: { focused: false, mousemove: false } });

    [`width`, `height`, `left`, `top`].forEach((name) => {
      const value = this.element.style.getPropertyValue(name);
      const [_match, num, unit] = /^(\d+(?:\.\d+)?)(.+)/.exec(value) ?? [];
      this.element.style.setProperty(name, ``);

      const offset = name.match(/left|top/) ? this.parent?.element?.getBoundingClientRect()?.[name] : 0;
      this.element.style.setProperty(`--${name[0]}`, num ?? this.element.getBoundingClientRect()[name] - offset);
      this.element.style.setProperty(`--${name[0]}-unit`, `1${unit ?? `px`}`);
    });

    const adjusters = [`tl`, `tm`, `tr`, `ml`, `mr`, `bl`, `bm`, `br`];
    this.adjusters = adjusters.map(
      (index) => new yoghurt.yoghurtAdjuster(this.element.appendChild(document.createElement(`div`)), index)
    );

    this.listen(`yoghurtfocused`);
    this.listen(`yoghurtunfocused`);
  }

  destructor() {
    super.destructor();

    this.element.style.setProperty(`--adjuster-display`, ``);
    this.element.style.setProperty(`--border-color`, ``);
    [`width`, `height`, `left`, `top`].forEach((name) => {
      const value = this.element.style.getPropertyValue(`--${name[0]}-unit`);
      const [_match, num, unit] = /^(\d+(?:\.\d+)?)(.+)/.exec(value) ?? [];
      this.element.style.setProperty(name, `${this.element.style.getPropertyValue(`--${name[0]}`) * num}${unit}`);

      this.element.style.setProperty(`--${name[0]}`, ``);
      this.element.style.setProperty(`--${name[0]}-unit`, ``);
    });

    this.adjusters.forEach((adjuster) => adjuster.destructor());

    this.unlisten(`yoghurtfocused`);
    this.unlisten(`yoghurtunfocused`);
  }

  onmousedown(event) {
    super.onmousedown(event);

    Object.assign(this.status, { mousemove: false });
    this.element.dispatchEvent(new yoghurt.FocusEvent(!this.status.focused));
  }

  onmousemove(event) {
    super.onmousemove(event);

    Object.assign(this.status, { mousemove: true });
    if (this.status.focused) this.element.dispatchEvent(new yoghurt.FocusEvent(false));
  }

  onmouseup(event) {
    super.onmouseup(event);

    if (this.status.mousemove) this.element.dispatchEvent(new yoghurt.FocusEvent(true));
  }

  onyoghurtfocused(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { focused: true });

    this.element.style.setProperty(`--adjuster-display`, `block`);
    this.element.style.setProperty(`--border-color`, `var(--color-focused)`);
  }

  onyoghurtunfocused(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { focused: false });

    this.element.style.setProperty(`--adjuster-display`, `none`);
    this.element.style.setProperty(`--border-color`, `var(--color-unfocused)`);
  }
};

yoghurt.yoghurtEditor = class extends yoghurt.yoghurtBlock {
  constructor(element) {
    super(element);

    Object.assign(this, { status: { editing: false } });

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

    this.listen(`mouseup`, document);
  }

  onmouseup(event) {
    if (!this.status.editing) return super.onmouseup(event);

    const selections = window.getSelection();
    for (let index = 0; index < selections.rangeCount; index++)
      selections.containsNode(this.element) &&
        this.element.dispatchEvent(new yoghurt.SelectEvent(selections.getRangeAt(index)));

    this.unlisten(`mouseup`, document);
  }

  ondblclick(event) {
    event.stopPropagation(), event.preventDefault();

    if (yoghurt.debug) console.log(this, event);

    this.element.dispatchEvent(new yoghurt.EditEvent(!this.status.editing));
  }

  onkeydown(event) {
    if (yoghurt.debug) console.log(this, event);
  }

  onyoghurtunfocused(event) {
    if (!this.status.editing) return super.onyoghurtunfocused(event);
  }

  onyoghurtedit(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { editing: true });

    this.element.dispatchEvent(new yoghurt.FocusEvent(true));
    this.element.setAttribute(`contenteditable`, ``);
    this.element.style.setProperty(`--border-shadow`, `10px`);
    this.element.style.setProperty(`cursor`, `text`);

    this.listen(`keydown`, document);
    this.listen(`yoghurtselect`);
  }

  onyoghurtedited(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { editing: false });

    window.getSelection().removeAllRanges();
    this.element.removeAttribute(`contenteditable`);
    this.element.style.setProperty(`--border-shadow`, `0px`);
    this.element.style.setProperty(`cursor`, ``);

    this.unlisten(`keydown`, document);
    this.unlisten(`yoghurtselect`);
  }

  onyoghurtselect(event) {
    if (yoghurt.debug) console.log(this, event);
  }
};

console.timeEnd(`Yoghurt Loaded`);
