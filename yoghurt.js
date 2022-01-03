`use strict`;

window.onload = () => yoghurt.enter(document.body);

console.time(`Yoghurt Loaded`);

/* -------------------------------------------------------------------------- */
/*                                 ENVIRONMENT                                */
/* -------------------------------------------------------------------------- */

var yoghurt = new Object();

yoghurt.debug = window?.env == `development` && {};
yoghurt.debug.verbose = false;
yoghurt.yoghurts = new Map();
yoghurt.style = document.createElement(`link`);
yoghurt.href = `${document.currentScript.src.split(`/`).slice(0, -1).join(`/`)}/yoghurt.css`;

Object.assign(yoghurt.style, { rel: `stylesheet`, type: `text/css`, href: yoghurt.href });
document.currentScript.parentNode.insertBefore(yoghurt.style, document.currentScript.nextElementSibling);

window.onmousedown = function (_event) {
  const fn = (it) => it.status?.focused && it !== this && it.element.dispatchEvent(new yoghurt.FocusEvent(false));
  yoghurt.yoghurts.forEach(fn);
};

/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

yoghurt.take = function (element) {
  if (!yoghurt.yoghurts.has(element))
    switch (element.tagName) {
      case `DIV`:
      case `SPAN`:
        return new yoghurt.yoghurtBlock(element);
    }
};

yoghurt.drop = function (element) {
  if (yoghurt.yoghurts.has(element)) return yoghurt.yoghurts.get(element).destructor();
};

yoghurt.enter = function (element) {
  const it = document.createNodeIterator(element, NodeFilter.SHOW_ELEMENT);
  for (let node = it.nextNode(); node !== null; node = it.nextNode()) yoghurt.take(node);
};

yoghurt.leave = function (element) {
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

  get range() {
    return this.detail.range;
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
    if (yoghurt.debug?.verbose) console.trace(element);

    Object.assign(this, { element });

    this.element.classList.add(`yoghurt`);
    yoghurt.yoghurts.set(element, this);

    this.listen(`mousedown`);
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.trace(this, this.element);

    this.element.classList.remove(`yoghurt`);
    yoghurt.yoghurts.delete(this.element, this);

    this.unlisten(`mousedown`);
  }

  onmousedown(event) {
    event.preventDefault();
    event.stopPropagation();
    window.onmousedown.call(this, event);

    if (yoghurt.debug) console.trace(this, event);

    const { pageX, pageY } = event;
    Object.assign(this, {
      offsetX: parseFloat(this.get(`--l-px`, `left`)) - pageX,
      offsetY: parseFloat(this.get(`--t-px`, `top`)) - pageY,
    });

    this.listen(`mousemove`, document);
    this.listen(`mouseup`, document);
  }

  onmousemove(event) {
    if (yoghurt.debug?.verbose) console.trace(this, event);

    if (!this.element.hasAttribute(`fixed-x`))
      this.element.style.setProperty(`--l`, (event.pageX + this.offsetX) / parseFloat(this.get(`--l-unit`, `left`)));
    if (!this.element.hasAttribute(`fixed-y`))
      this.element.style.setProperty(`--t`, (event.pageY + this.offsetY) / parseFloat(this.get(`--t-unit`, `top`)));
  }

  onmouseup(event) {
    if (yoghurt.debug) console.trace(this, event);

    this.unlisten(`mousemove`, document);
    this.unlisten(`mouseup`, document);
  }
};

yoghurt.yoghurtAdjuster = class extends yoghurt.yoghurt {
  constructor(element, index) {
    if (yoghurt.debug?.verbose) console.trace(element);
    super(element);

    Object.assign(this, { index });
    if (this.index.endsWith(`m`)) this.element.setAttribute(`fixed-x`, ``);
    if (this.index.startsWith(`m`)) this.element.setAttribute(`fixed-y`, ``);
    const sign = { t: -1, l: -1, m: 0, b: 1, r: 1 };
    Object.assign(this, { sign: Array.from(this.index).map((c) => sign[c]) });

    this.element.classList.add(`yoghurt-adjuster`, `yoghurt-adjuster-${this.index}`);
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.trace(this, this.element);

    this.element.remove();
  }

  onmousedown(event) {
    if (yoghurt.debug?.verbose) console.trace(this, event);
    super.onmousedown(event), this.parent.onmousedown(event);

    const { pageX, pageY } = event;
    Object.assign(this, {
      offsetW: parseFloat(this.parent.get(`--w-px`, `left`)) - pageX * this.sign[1],
      offsetH: parseFloat(this.parent.get(`--h-px`, `top`)) - pageY * this.sign[0],
    });

    this.element.style.setProperty(`--adjuster-display`, `block`);
    if (!this.index.endsWith(`l`)) this.parent.element.setAttribute(`fixed-x`, ``);
    if (!this.index.startsWith(`t`)) this.parent.element.setAttribute(`fixed-y`, ``);
  }

  onmousemove(event) {
    if (yoghurt.debug?.verbose) console.trace(this, event);
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
    if (yoghurt.debug?.verbose) console.trace(this, event);
    super.onmouseup(event);

    this.element.style.setProperty(`--adjuster-display`, ``);
    this.parent.element.removeAttribute(`fixed-x`);
    this.parent.element.removeAttribute(`fixed-y`);
    this.parent.element.dispatchEvent(new yoghurt.FocusEvent(true));
  }
};

yoghurt.yoghurtBlock = class extends yoghurt.yoghurt {
  constructor(element) {
    if (yoghurt.debug?.verbose) console.trace(element);
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
    if (yoghurt.debug?.verbose) console.trace(this, this.element);
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
    if (yoghurt.debug?.verbose) console.trace(this, event);
    super.onmousedown(event);

    Object.assign(this.status, { mousemove: false });
    this.element.dispatchEvent(new yoghurt.FocusEvent(!this.status.focused));
  }

  onmousemove(event) {
    if (yoghurt.debug?.verbose) console.trace(this, event);
    super.onmousemove(event);

    Object.assign(this.status, { mousemove: true });
    if (this.status.focused) this.element.dispatchEvent(new yoghurt.FocusEvent(false));
  }

  onmouseup(event) {
    if (yoghurt.debug?.verbose) console.trace(this, event);
    super.onmouseup(event);

    if (this.status.mousemove) this.element.dispatchEvent(new yoghurt.FocusEvent(true));
  }

  onyoghurtfocused(event) {
    if (yoghurt.debug) console.trace(this, event);
    Object.assign(this.status, { focused: true });

    this.element.style.setProperty(`--adjuster-display`, `block`);
    this.element.style.setProperty(`--border-color`, `var(--color-focused)`);
  }

  onyoghurtunfocused(event) {
    if (yoghurt.debug) console.trace(this, event);
    Object.assign(this.status, { focused: false });

    this.element.style.setProperty(`--adjuster-display`, `none`);
    this.element.style.setProperty(`--border-color`, `var(--color-unfocused)`);
  }
};

yoghurt.yoghurtEditor = class extends yoghurt.yoghurtBlock {
  constructor(element) {
    if (yoghurt.debug?.verbose) console.trace(element);
    super(element);

    Object.assign(this, { status: { editing: false } });

    this.listen(`dblclick`);
    this.listen(`yoghurtedit`);
    this.listen(`yoghurtedited`);
    this.listen(`yoghurtunfocused`);
  }

  destructor() {
    if (yoghurt.debug?.verbose) console.trace(this, this.element);
    super.destructor();

    this.unlisten(`dblclick`);
    this.unlisten(`yoghurtfocused`);
    this.unlisten(`yoghurtunfocused`);
  }

  onmousedown(event) {
    if (this.status.editing) return event.stopPropagation();

    if (yoghurt.debug?.verbose) console.trace(this, event);
    super.onmousedown(event);
  }

  ondblclick(event) {
    if (yoghurt.debug) console.trace(this, event);

    this.element.dispatchEvent(new yoghurt.EditEvent(!this.status.editing));
  }

  onyoghurtedit(event) {
    if (yoghurt.debug) console.trace(this, event);
    Object.assign(this.status, { editing: true });
  }

  onyoghurtedited(event) {
    if (yoghurt.debug) console.trace(this, event);
    Object.assign(this.status, { editing: false });
  }
};

// yoghurtclass yoghurtText extends yoghurtBlock {
//   constructor(element) {
//     if (yoghurt.debug?.verbose) console.trace(element);
//     super(element);

//     Object.assign(this.status, { editing: false });

//     this.textarea = this.add(`yoghurt yoghurt-text`, `textarea`);

//     this.listen(`dblclick`);
//     this.listen(`yoghurtedit`);
//     this.listen(`yoghurtedited`);
//   }

//   ondblclick(event) {
//     // event.preventDefault(), event.stopPropagation();

//     if (yoghurt.debug) console.trace(this, event);

//     Object.assign(this.status, { editing: !this.status.editing });
//     this.element.dispatchEvent(new EditEvent(`yoghurtedit${this.status.editing ? `` : `ed`}`));
//     // if (this.editing) this.textarea.style.setProperty(``)
//   }

//   onyoghurtedit(event) {
//     if (yoghurt.debug) console.trace(this, event);
//   }

//   onyoghurtedited(event) {
//     if (yoghurt.debug) console.trace(this, event);
//   }
// }

console.timeEnd(`Yoghurt Loaded`);
