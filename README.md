<div align="center">

# Simplify — Landing

### A cinematic WebGL landing for an autonomous AI career agent

[![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=black)](https://gsap.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

[![Live Demo](https://img.shields.io/badge/Live_Demo-wesimplify.works-1C4839?style=for-the-badge&logo=googlechrome&logoColor=white)](https://wesimplify.works/)

</div>

---

## 📖 About

**Simplify — Landing** is the marketing site for [Simplify](https://wesimplify.works/), an autonomous
AI career agent. Instead of a conventional scroll-of-sections page, the landing is a single
full-screen WebGL experience: a real-time 3D scene that the visitor moves through stage by
stage, rendered on one `<canvas>` with a synchronized DOM UI layer on top.

The journey carries the product's core promise — *name the job, and the agent finds roles,
tailors your profile, and applies for you* — through origami creatures, glass-shatter moments,
a tunnel fly-through, and animated company cards, finishing at a "Start your campaign" handoff
into the Simplify platform.

## ✨ Highlights

- 🌐 **Real-time WebGL scene** — a Three.js renderer driving glTF models (Draco-compressed),
  matcap materials, godrays, and post-processing across a multi-stage narrative.
- 🎬 **Scroll-driven animation** — GSAP with ScrollTrigger sequences the camera and stage
  transitions so progress maps directly to the visitor's input.
- 🗜️ **KTX2 / Basis GPU textures** — compressed texture atlases (clouds, world, certificates,
  hands) transcoded in-browser for fast loads and low VRAM.
- 🔊 **Ambient audio & sound design** — layered ambience and interaction FX via Howler.js, with
  an iOS audio-session shim so sound plays even with the silent switch on.
- 🔤 **Custom typography** — bespoke faces (PP Supply Sans / Mono, STK Bureau Serif) alongside
  Google Fonts for the editorial, cinematic feel.
- 📱 **Built for the device** — mobile-specific video/texture variants, small-viewport-aware
  pre-canvas placeholder, and reduced-motion handling.

## 🖼️ Screenshots

<!-- TODO: Add screenshots / a capture of the landing here.
     This is a highly visual, animated experience — stills and a short clip
     communicate it far better than prose. Suggested shots: loader, origami
     stage, tunnel fly-through, company cards, final CTA. -->

> _A landing this visual deserves imagery — captures coming soon._

## 🛠️ Tech Stack

| Area | Technology |
| --- | --- |
| 3D / Rendering | [Three.js](https://threejs.org/) — `WebGLRenderer`, `GLTFLoader`, `KTX2Loader`, `DRACOLoader`, post-processing |
| Animation | [GSAP](https://gsap.com/) + ScrollTrigger |
| Audio | [Howler.js](https://howlerjs.com/) |
| Language / Tooling | JavaScript (ES modules), bundled with [Vite](https://vitejs.dev/) |
| Assets | glTF models, KTX2/Basis texture atlases, WebP images, MP4 video, MP3 audio |
| Analytics | Google Analytics (gtag) |
| Hosting | [Vercel](https://vercel.com/) |

## 🚀 Getting Started

This repository contains the **production build** — the compiled static bundle (hashed
`assets/`, `vendor/` decoders, and `index.html`) rather than application source. It runs on any
static file server; no build step is required to preview it.

```bash
# Clone the repository
git clone https://github.com/baimukhanalan/simplify-landing.git
cd simplify-landing

# Serve it locally with any static server, e.g.:
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL (for example `http://localhost:8000`).

> **Note:** serve over HTTP rather than opening `index.html` from the filesystem — the scene
> loads ES modules, WASM decoders, and cross-origin assets that browsers block under `file://`.
> Deployment is handled by Vercel (see `vercel.json`).

## 📂 Project Structure

```
.
├── index.html              # Entry point: canvas, UI layer, loader gradient
├── assets/
│   ├── main-*.js           # Bundled application (Three.js scene, GSAP, audio)
│   ├── main-*.css          # Bundled styles
│   ├── sfy-*.js            # Interlude, app-link handoff, iOS audio session
│   ├── models/ · origami/  # glTF (.glb) 3D models
│   ├── atlases/            # KTX2 compressed texture atlases
│   ├── textures/ · ui/     # WebP textures and interface art
│   ├── videos/ · audio/    # MP4 backgrounds and MP3 ambience/FX
│   ├── fonts/              # Custom OTF typefaces
│   └── brand/              # Favicons, OG image, logos
├── vendor/
│   ├── draco/              # Draco mesh decoder (WASM)
│   └── basis/              # Basis/KTX2 transcoder (WASM)
└── vercel.json             # Hosting / cache headers
```

## 📄 License

Released under the [MIT License](LICENSE). © 2026 Alan Bai.
