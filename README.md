# yoghurt.js

HTML edition in place



**Quick hack**

Open Web page. Bring up the console (`⌘ + ⌥ + C` on Mac):
1. Load Scripts
```js
Object.assign(document.head.appendChild(document.createElement(`script`)), { type: `text/javascript`, src: `https://little-yoghurt.com/yoghurt.js` })
Object.assign(document.head.appendChild(document.createElement(`link`)), { rel: `stylesheet`, href: `https://little-yoghurt.com/yoghurt.css` })
```
2. Take Control
```js
yoghurt.enter() // pass the element as subtree root. default to `document.body`
```

