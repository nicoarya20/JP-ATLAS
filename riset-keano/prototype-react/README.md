# PM Dashboard: mobile prototype (React + Cupertino)

A clickable phone prototype of the PM Dashboard, built with React 18 and [react-cupertino-ui](https://react-cupertino-ui.pro) (iOS look).
It replaces the vanilla `../wireframe-mobile/` prototype and keeps its screen and sheet ids (65 in all, with `home.create` and the `profile.me` overlay added), three roles and sample data.

## Run
```bash
npm install
npm run dev     # http://localhost:5173 = screen index + phone frame
npm test        # router, every screen per role, source lint
npm run build
```

## How it fits together
- `index.html` (`src/index/`) is the screen index:
  - It has a role switch (Member, Project Manager, Admin) and a Light/Dark switch.
  - It shows `phone.html` in a 390×844 iframe.
  - Switching role or mode reloads the frame with `?role=&mode=`.
  - A link click posts a `pm-proto:go` message.
- `phone.html` (`src/main.jsx`) is the app.
  - Screens register themselves in `src/core/registry.js`.
  - Navigation state lives in `src/core/app.context.jsx`.
  - The URL hash shows the current screen, e.g. `phone.html?role=admin#users.roles`.
- Fixed bars and bottom sheets are positioned against the iframe viewport, which is why the phone is an iframe.
- `src/kit/` wraps the library into the parts screens use. `BRIEF.md` documents the screen API.
