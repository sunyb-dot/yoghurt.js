`use strict`;

console.time(`Yoghurt Loaded`);

/* -------------------------------------------------------------------------- */
/*                                 ENVIRONMENT                                */
/* -------------------------------------------------------------------------- */

var yoghurt = new Object();

yoghurt.debug = window.env === `development` && {};
yoghurt.debug.verbose = false;
yoghurt.parent = document.currentScript?.parentNode;
yoghurt.yoghurts = new Map();

window.onmousedown = function (_event) {
  const unfocus = (it) => it.status?.focused && it !== this && it.shadow.dispatchEvent(new yoghurt.FocusEvent(false));
  yoghurt.yoghurts.forEach(unfocus);

  const edited = (it) => it.status?.editing && it !== this && it.shadow.dispatchEvent(new yoghurt.EditEvent(false));
  yoghurt.yoghurts.forEach(edited);
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

/* -------------------------------------------------------------------------- */
/*                                   YOGHURT                                  */
/* -------------------------------------------------------------------------- */

yoghurt.yoghurt = class {
  get parent() {
    return yoghurt.yoghurts.get(this.element.parentElement);
  }

  listen(type, element = this.shadow) {
    this.unlisten(type, element); // in case of unpaired listen/un() !

    const listener = this[`on${type}`].bind(this);
    element.addEventListener(type, listener);
    this[`${type}Listener`] = listener;
  }

  unlisten(type, element = this.shadow) {
    const listener = this[`${type}Listener`];
    element.removeEventListener(type, listener);
    delete this[`${type}Listener`];
  }

  constructor(element) {
    if (yoghurt.debug?.verbose) console.log(element);

    yoghurt.yoghurts.set(element, this);

    const shadow = document.createElement(`div`);
    shadow.classList.add(`yoghurt`);
    element.prepend(shadow);

    Object.assign(this, { element, shadow });

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
    window.onmousedown.call(this, event);

    if (yoghurt.debug) console.log(this, event);

    const { pageX, pageY } = event;
    Object.assign(this, { offsetX: parseFloat(getComputedStyle(this.element).getPropertyValue(`left`)) - pageX });
    Object.assign(this, { offsetY: parseFloat(getComputedStyle(this.element).getPropertyValue(`top`)) - pageY });

    this.listen(`mousemove`, document);
    this.listen(`mouseup`, document);
  }

  onmousemove(event) {
    if (yoghurt.debug?.verbose) console.log(this, event);

    const get = (name) =>
      this.element.style.setProperty(name, `1%`) || parseFloat(getComputedStyle(this.element).getPropertyValue(name));
    const set = (value, property) =>
      this.element.style.getPropertyValue(property).endsWith(`%`) ? `${value / get(property)}%` : `${value}px`;
    if (!this.shadow.hasAttribute(`fixed-x`))
      this.element.style.setProperty(`left`, set(event.pageX + this.offsetX, `left`));
    if (!this.shadow.hasAttribute(`fixed-y`))
      this.element.style.setProperty(`top`, set(event.pageY + this.offsetY, `top`));
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

    this.shadow.classList.add(`yoghurt-adjuster`, `yoghurt-adjuster-${index}`);
    if (index.endsWith(`m`)) this.shadow.setAttribute(`fixed-x`, ``);
    if (index.startsWith(`m`)) this.shadow.setAttribute(`fixed-y`, ``);

    const sign = { t: -1, l: -1, m: 0, b: 1, r: 1 };
    Object.assign(this, { index, sign: Array.from(index).map((c) => sign[c]) });
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.log(this, this.element);
  }

  onmousedown(event) {
    super.onmousedown(event), setTimeout(() => this.parent.onmousedown(event));

    const { pageX, pageY } = event;
    Object.assign(this, {
      offsetW: parseFloat(getComputedStyle(this.element).getPropertyValue(`width`)) - pageX * this.sign[1],
      offsetH: parseFloat(getComputedStyle(this.element).getPropertyValue(`height`)) - pageY * this.sign[0],
    });

    if (!this.index.endsWith(`l`)) this.parent.shadow.setAttribute(`fixed-x`, ``);
    if (!this.index.startsWith(`t`)) this.parent.shadow.setAttribute(`fixed-y`, ``);

    this.shadow.style.setProperty(`--adjuster-display`, `block`);

    this.parent.shadow.dispatchEvent(new yoghurt.EditEvent(false));
  }

  onmousemove(event) {
    super.onmousemove(event);

    const get = (name) =>
      this.element.style.setProperty(name, `1%`) || parseFloat(getComputedStyle(this.element).getPropertyValue(name));
    const set = (value, property) =>
      this.element.style.getPropertyValue(property).endsWith(`%`) ? `${value / get(property)}%` : `${value}px`;
    if (!this.element.hasAttribute(`fixed-w`))
      this.parent.element.style.setProperty(`width`, set(event.pageX * this.sign[1] + this.offsetW, `width`));
    if (!this.element.hasAttribute(`fixed-h`))
      this.parent.element.style.setProperty(`height`, set(event.pageY * this.sign[0] + this.offsetH, `height`));

    this.element.style.setProperty(`left`, ``);
    this.element.style.setProperty(`top`, ``);
  }

  onmouseup(event) {
    super.onmouseup(event);

    this.parent.shadow.removeAttribute(`fixed-x`);
    this.parent.shadow.removeAttribute(`fixed-y`);

    this.shadow.style.setProperty(`--adjuster-display`, ``);
    this.parent.shadow.dispatchEvent(new yoghurt.FocusEvent(true));
  }
};

yoghurt.yoghurtBlock = class extends yoghurt.yoghurt {
  constructor(element) {
    super(element);

    Object.assign(this, { status: { focused: false, mousemove: false }, adjusters: [] });

    this.listen(`yoghurtfocused`);
    this.listen(`yoghurtunfocused`);
  }

  destructor() {
    super.destructor();

    this.unlisten(`yoghurtfocused`);
    this.unlisten(`yoghurtunfocused`);
  }

  onmousedown(event) {
    super.onmousedown(event);

    Object.assign(this.status, { mousemove: false });
    this.shadow.dispatchEvent(new yoghurt.FocusEvent(!this.status.focused));
  }

  onmousemove(event) {
    super.onmousemove(event);

    Object.assign(this.status, { mousemove: true });
    if (this.status.focused) this.shadow.dispatchEvent(new yoghurt.FocusEvent(false));
  }

  onmouseup(event) {
    super.onmouseup(event);

    if (this.status.mousemove) this.shadow.dispatchEvent(new yoghurt.FocusEvent(true));
  }

  onyoghurtfocused(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { focused: true });

    this.shadow.style.setProperty(`--adjuster-display`, `block`);
    this.shadow.style.setProperty(`--border-color`, `var(--color-focused)`);

    this.adjusters = [`tl`, `tm`, `tr`, `ml`, `mr`, `bl`, `bm`, `br`].map(
      (index) => new yoghurt.yoghurtAdjuster(this.shadow, index)
    );
  }

  onyoghurtunfocused(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { focused: false });

    this.shadow.style.setProperty(`--adjuster-display`, `none`);
    this.shadow.style.setProperty(`--border-color`, `var(--color-unfocused)`);

    this.adjusters.forEach((adjuster) => adjuster.destructor());
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

    if (yoghurt.debug) console.log(this, event);

    this.listen(`mouseup`, document);
  }

  onmouseup(event) {
    if (!this.status.editing) return super.onmouseup(event);

    if (yoghurt.debug) console.log(this, event);

    const selections = window.getSelection();
    for (let index = 0; index < selections.rangeCount; index++)
      this.shadow.dispatchEvent(new yoghurt.SelectEvent(selections.getRangeAt(index))); // TODO: check contains

    this.unlisten(`mouseup`, document);
  }

  ondblclick(event) {
    event.stopPropagation(), event.preventDefault();

    if (yoghurt.debug) console.log(this, event);

    this.shadow.dispatchEvent(new yoghurt.EditEvent(!this.status.editing));
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

    this.element.setAttribute(`contenteditable`, ``);
    this.element.focus();

    this.shadow.style.setProperty(`display`, `none`);

    this.listen(`mousedown`, this.element);
    this.listen(`keydown`, document);
    this.listen(`yoghurtselect`);

    this.shadow.dispatchEvent(new yoghurt.FocusEvent(true));
  }

  onyoghurtedited(event) {
    if (yoghurt.debug) console.log(this, event);
    Object.assign(this.status, { editing: false });

    this.element.removeAttribute(`contenteditable`);
    this.element.blur();

    this.shadow.style.setProperty(`display`, ``);

    window.getSelection().removeAllRanges();

    this.unlisten(`mousedown`, this.element);
    this.unlisten(`keydown`, document);
    this.unlisten(`yoghurtselect`);
  }

  onyoghurtselect(event) {
    if (yoghurt.debug) console.log(this, event);
  }
};

console.timeEnd(`Yoghurt Loaded`);
