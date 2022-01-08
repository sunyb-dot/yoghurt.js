# yoghurt.js

![demo](/demo-1080.gif)

​	🎨 Tidy & lightweight HTML editor in place. Drag 'n 'drop to move elements around. No unnecessary changes to original document are made.



## Quick hack

1. Open Web page. Bring up the console (`⌘ + ⌥ + C` on Mac):

2. Load Scripts

```js
Object.assign(document.head.appendChild(document.createElement(`script`)), { type: `text/javascript`, src: `https://little-yoghurt.com/yoghurt.js` })
Object.assign(document.head.appendChild(document.createElement(`link`)), { rel: `stylesheet`, href: `https://little-yoghurt.com/yoghurt.css` })
```
3. Take Control

```js
yoghurt.enter() // pass the element as subtree root. default to `document.body`
```



## How it works

- `yoghurt.enter`:

  Append a `div` to every editable element and manage them (Listening to mouse/keyboard events, ect.)

- `yoghurt.leave`:

  Remove each additional `div` in the subtree and hand over control



## Functionality

- Copy, paste and delete
- Move and resize (With magnetic attaching and auxiliary lines)
- Edit text content with double-click



> Script and stylesheet are currently available at [yoghurt.js](https://little-yoghurt.com/yoghurt.js) and [yoghurt.css](https://little-yoghurt.com/yoghurt.css)

