# Golf Skins — Live Shared App

A tiny web server that lets every golfer enter scores into **one shared, live
leaderboard**. Built on Node + Express with a simple JSON-file database (no
external database to set up).

The app itself is the same `golf-skins.html` you already have. When it's opened
as a local file it runs offline (browser storage). When it's served by this
server over http/https it automatically switches into **live shared mode**:
everyone who opens the link with the same *round code* sees the same scores.

---

## 1. One-time setup

1. Put the app file in place: copy your **`golf-skins.html`** into this folder's
   `public/` directory and rename it to **`index.html`**.

   So you should end up with: `golf-app/public/index.html`

2. From the `golf-app` folder, install and start:

   ```bash
   npm install
   npm start
   ```

3. Open **http://localhost:3000/?r=lacanada** in your browser.
   The `r=` part is the *round code* — anything you like (e.g. `?r=saturday`).

Everyone on the same Wi-Fi can reach it at `http://YOUR-COMPUTER-IP:3000/?r=lacanada`.

---

## 2. Put it online (so phones on cell data can use it)

Free option — **Render.com**:

1. Push this `golf-app` folder to a GitHub repo (make sure `public/index.html` is included).
2. On render.com → **New → Web Service** → connect the repo.
3. Settings: Build command `npm install`, Start command `npm start`.
   Render sets the port automatically (the server reads `PORT`).
4. Deploy. You'll get a URL like `https://your-app.onrender.com`.
5. Share `https://your-app.onrender.com/?r=lacanada` with the golfers.

Other hosts that work the same way: Railway, Fly.io, Glitch, Cyclic.

> Note: on Render's free tier the server sleeps when idle and its disk is
> ephemeral, so a long-finished round may eventually be cleared. For a single
> day's golf that's fine. For permanent storage, point `DATA_FILE` at a mounted
> persistent disk, or swap the JSON store for a hosted database.

---

## 3. How it works on the course

- One person sets up the **Players / Flights / Groups / Pairs / Options** (this
  is the "config"). That pushes to the server.
- During play, **anyone** can open the link and enter scores. Each score cell is
  sent to the server individually, so two phones entering different players never
  overwrite each other.
- Every device polls the server every few seconds, so the **Skins**, **Leaderboards**,
  and score grids update live for everyone.
- The password (`0000`) still guards *Fill blanks with par* and *Clear all scores*.

---

## API (for reference)

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/round/:code` | full state `{version, snapshot}` |
| PUT  | `/api/round/:code/config` | replace players/options/course (keeps scores) |
| POST | `/api/round/:code/score` | set one cell `{id, h, v}` |
| POST | `/api/round/:code/bulk` | set many cells `{scores:{id:[...]}}` |

Data is stored in `data.json` next to `server.js`.
