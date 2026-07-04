# assets/

Mostly the game draws with the HTML Canvas, but web-ready reference images live
here too.

## In use
- **`cms_detector.png`** — the official CMS cutaway (converted from
  `image/cms_160312_02.pdf`, palette-optimised to ~240 KB). Shown in the
  "🔬 Real CMS detector" modal, opened from the accelerator screen and the Event
  Explorer. Image credit: CERN / CMS Collaboration.

  Regenerate from the source PDF with:
  ```
  pdftocairo -png -singlefile -scale-to-x 1600 -scale-to-y -1 \
    image/cms_160312_02.pdf assets/cms_detector
  convert assets/cms_detector.png -strip -colors 256 PNG8:assets/cms_detector.png
  ```

Raw source art (large `.pdf` / `.eps`) lives in `../image/` and is **git-ignored**
— only the optimised web assets in this folder are committed and served.

## Reference images to add (optional)

Two images were suggested for outreach fidelity. They are **not** in the repo yet
because they lived on a local machine and could not be copied here.

| File | What it is | Where it could plug in |
|------|-----------|------------------------|
| `CMS_2Muons_Red.png` | A real CMS event display of a Z → μμ event | Faint backdrop behind the detector canvas, or a splash on the Z-boson briefing |
| `slice_white_v1.svg` (converted from `slice_white_v1.eps`) | The classic CMS transverse "slice" showing how each particle interacts with each detector layer | A "how the detector sees particles" legend / help panel |

### Notes
- **EPS does not render in browsers.** Convert `slice_white_v1.eps` to **SVG**
  (preferred, stays crisp) or PNG first, e.g.:
  ```
  # SVG (vector)
  inkscape slice_white_v1.eps --export-type=svg -o slice_white_v1.svg
  # or PNG
  convert -density 300 slice_white_v1.eps slice_white_v1.png
  ```
- Keep files reasonably small; they are served statically from GitHub Pages.
- Once added here, tell the maintainer where you'd like each one used and it can
  be wired into the relevant screen.
