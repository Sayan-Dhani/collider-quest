# assets/

The game currently draws everything with the HTML Canvas — no image files are
required. This folder is a place to drop optional reference art to raise the
visual fidelity later.

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
