<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

<script>

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const bladeInput = document.getElementById('blade-thickness');
  const offsetInput = document.getElementById('blade-offset');
  const unitSelect = document.getElementById('unit-type');
  const MIN_DIMENSION_MM = 46;
  const MIN_DIMENSION_VISIBILITY_MM = 46;

  const addAvailBtn = document.getElementById('add-available');
  const availAnchor = addAvailBtn.closest('div');
  const firstAvailWrapper = availAnchor.nextElementSibling;
  const availRows = document.createElement('div');
  availRows.id = 'available-rows';
  firstAvailWrapper.insertAdjacentElement('afterend', availRows);

  const addReqBtn = document.getElementById('add-required');
  const reqAnchor = addReqBtn.closest('div');
  const firstReqWrapper = reqAnchor.nextElementSibling;
  const reqRows = document.createElement('div');
  reqRows.id = 'required-rows';
  firstReqWrapper.insertAdjacentElement('afterend', reqRows);

  const previewsDiv = document.getElementById('sheet-previews');

  function canvasPointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const view = {
    scale: 1, minScale: 0.2, maxScale: 5,
    offsetX: 0, offsetY: 0,
    isPanning: false, mouseDown: false,
    startX: 0, startY: 0, downClientX: 0, downClientY: 0
  };
  const DRAG_SLOP_PX = 3;
  const ZOOM_STEP = 1.6;
  const EPS = 1e-3;

  function updateCanvasCursor() {
    if (view.isPanning) { canvas.style.cursor = 'grabbing'; return; }
    canvas.style.cursor = (view.scale >= view.maxScale - EPS) ? 'zoom-out' : 'zoom-in';
  }

  function applyZoom(targetScale, anchorX, anchorY) {
    const newScale = Math.max(view.minScale, Math.min(view.maxScale, targetScale));
    const worldX = (anchorX - view.offsetX) / view.scale;
    const worldY = (anchorY - view.offsetY) / view.scale;
    view.scale = newScale;
    view.offsetX = anchorX - worldX * view.scale;
    view.offsetY = anchorY - worldY * newScale;
  }

  function resetZoom() { view.scale = 1; view.offsetX = 0; view.offsetY = 0; }

  canvas.addEventListener('mouseenter', updateCanvasCursor);
  canvas.addEventListener('mousemove', () => { if (!view.mouseDown && !view.isPanning) updateCanvasCursor(); });
  canvas.addEventListener('mouseleave', () => { view.mouseDown = false; view.isPanning = false; canvas.style.cursor = 'default'; });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    view.mouseDown = true; view.isPanning = false;
    const p = canvasPointFromEvent(e);
    view.startX = p.x - view.offsetX;
    view.startY = p.y - view.offsetY;
    view.downClientX = e.clientX; view.downClientY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!view.mouseDown) return;
    const dx = e.clientX - view.downClientX;
    const dy = e.clientY - view.downClientY;
    if (!view.isPanning && (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX)) {
      view.isPanning = true; canvas.style.cursor = 'grabbing';
    }
    if (view.isPanning) {
      const p = canvasPointFromEvent(e);
      view.offsetX = p.x - view.startX;
      view.offsetY = p.y - view.startY;
      drawMain();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!view.mouseDown) return;
    const wasPanning = view.isPanning;
    view.mouseDown = false; view.isPanning = false;
    if (!wasPanning) {
      const p = canvasPointFromEvent(e);
      if (view.scale >= view.maxScale - EPS) resetZoom();
      else {
        applyZoom(view.scale * ZOOM_STEP, p.x, p.y);
        if (view.scale > view.maxScale) view.scale = view.maxScale;
      }
      drawMain();
    }
    updateCanvasCursor();
  });

  function readInitialRow(wrapper, keys) {
    const obj = {};
    for (const [idKey, outKey] of keys) {
      const el = wrapper.querySelector(`#${idKey}`);
      obj[outKey] = el ? Number(el.value) : NaN;
    }
    return obj;
  }

  function makeAvailRow(w = '', h = '', q = '1', not_first = true) {
    const row = document.createElement('div');
    row.className = `flex flex-row ${not_first ? 'mt-8' : ''} available-row`;
    row.style.gap = '16px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <div>
        <div class="material-label"><label>Length</label></div>
        <div class="material-input-with-select">
          <div class="input-wrapper">
            <input class="material-input avail-w" type="number" min="0" step="0.01" value="${w}" oninput="this.value = Number(this.value) || ''"/>
            <span class="unit"></span>
          </div>
        </div>
      </div>
      <div>
        <div class="material-label"><label>Width</label></div>
        <div class="material-input-with-select">
          <div class="input-wrapper">
            <input class="material-input avail-h" type="number" min="0" step="0.01" value="${h}" oninput="this.value = Number(this.value) || ''"/>
            <span class="unit"></span>
          </div>
        </div>
      </div>
      <div>
        <div class="material-label"><label>Quantity</label></div>
        <div class="material-input-with-select">
          <div class="input-wrapper">
            <input class="material-input avail-q" type="number" min="0" step="1" pattern="\\d+" value="${q}" oninput="this.value = Math.floor(Number(this.value)) || ''"/>
            <span style="padding: 0 .75rem;">units</span>
          </div>
        </div>
      </div>
      <button ${not_first ? '' : 'disabled'} type="button" class="material-input remove-row" style="width:auto;overflow:visible;font-size:1.5rem;color:white;${not_first ? '' : 'opacity:0;'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style="transform: rotate(45deg); overflow: visible; pointer-events: none;">
          <circle cx="10" cy="10" r="10" fill="white"></circle>
          <line x1="10" y1="4.5" x2="10" y2="15.5" stroke="green" stroke-width="1.5" stroke-linecap="round"></line>
          <line x1="4.5" y1="10" x2="15.5" y2="10" stroke="green" stroke-width="1.5" stroke-linecap="round"></line>
        </svg>
      </button>
    `;
    return row;
  }

  function makeReqRow(w = '', h = '', q = '1', label = '', not_first = true) {
    const row = document.createElement('div');
    row.className = `flex flex-row ${not_first ? 'mt-8' : ''} required-row`;
    row.style.gap = '16px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <div>
        <div class="material-label"><label>Length</label></div>
        <div class="material-input-with-select">
          <div class="input-wrapper">
            <input class="material-input req-w" type="number" min="0" step="0.01" value="${w}" oninput="this.value = Number(this.value) || ''"/>
            <span class="unit"></span>
          </div>
        </div>
      </div>
      <div>
        <div class="material-label"><label>Width</label></div>
        <div class="material-input-with-select">
          <div class="input-wrapper">
            <input class="material-input req-h" type="number" min="0" step="0.01" value="${h}" oninput="this.value = Number(this.value) || ''"/>
            <span class="unit"></span>
          </div>
        </div>
      </div>
      <div>
        <div class="material-label"><label>Quantity</label></div>
        <div class="material-input-with-select">
          <div class="input-wrapper">
            <input class="material-input req-q" type="number" min="0" step="1" pattern="\\d+" value="${q}" oninput="this.value = Math.floor(Number(this.value)) || ''"/>
            <span style="padding: 0 .75rem;">units</span>
          </div>
        </div>
      </div>
      <button ${not_first ? '' : 'disabled'} type="button" class="material-input remove-row" style="width:auto;overflow:visible;font-size:1.5rem;color:white;${not_first ? '' : 'opacity:0;'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style="transform: rotate(45deg); overflow: visible; pointer-events: none;">
          <circle cx="10" cy="10" r="10" fill="white"></circle>
          <line x1="10" y1="4.5" x2="10" y2="15.5" stroke="green" stroke-width="1.5" stroke-linecap="round"></line>
          <line x1="4.5" y1="10" x2="15.5" y2="10" stroke="green" stroke-width="1.5" stroke-linecap="round"></line>
        </svg>
      </button>
    `;
    return row;
  }

  const initAvail = readInitialRow(firstAvailWrapper, [
    ['available-width', 'width'], ['available-length', 'height'], ['available-quantity', 'quantity']
  ]);
  availRows.appendChild(makeAvailRow(initAvail.width || '2440', initAvail.height || '1220', initAvail.quantity || '1', false));

  const initReq = readInitialRow(firstReqWrapper, [
    ['required-width', 'width'], ['required-length', 'height'], ['required-quantity', 'quantity']
  ]);
  reqRows.appendChild(makeReqRow(initReq.width || '', initReq.height || '', initReq.quantity || '', '', false));

  firstAvailWrapper.style.display = 'none';
  firstReqWrapper.style.display = 'none';

  function addAvailableRowAndFocus() {
    const row = makeAvailRow();
    availRows.appendChild(row);
    render();
    const inp = row.querySelector('.avail-w');
    requestAnimationFrame(() => { inp?.focus(); inp?.select(); });
    return row;
  }

  function addRequiredRowAndFocus() {
    const row = makeReqRow();
    reqRows.appendChild(row);
    render();
    const inp = row.querySelector('.req-w');
    requestAnimationFrame(() => { inp?.focus(); inp?.select(); });
    return row;
  }

  reqRows.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && e.target?.classList.contains('req-q')) {
      const rows = [...reqRows.querySelectorAll('.required-row')];
      if (rows.length && rows[rows.length - 1].contains(e.target)) {
        e.preventDefault();
        addRequiredRowAndFocus();
      }
    }
  });

  addAvailBtn.addEventListener('click', addAvailableRowAndFocus);
  addReqBtn.addEventListener('click', addRequiredRowAndFocus);

  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-row')) {
      const row = e.target.closest('.available-row, .required-row');
      row?.parentElement?.removeChild(row);
      render();
    }
  });

  document.body.addEventListener('input', (e) => {
    if (e.target.matches('.avail-w,.avail-h,.avail-q,.req-w,.req-h,.req-q,.req-label,#blade-thickness,#blade-offset')) {
      render();
    }
  });


  function getSelectedUnit() {
    return unitSelect?.value || 'mm';
  }

  function mmToUnitFactor(unit) {
    return unit === 'in' ? 1 / 25.41 : 1; 
  }

  function fmtLenFromMM(mm, dp = 2) {
    const unit = getSelectedUnit();
    const factor = mmToUnitFactor(unit);
    return fmt(mm * factor, unit === 'in' ? 2 : 0); 
  }

  function fmtAreaFromMM2(mm2, dp = 3) {
    const unit = getSelectedUnit();
    const factor = unit === 'in' ? 1 / (25.41 * 25.41) : 0.000001; 
    return fmt(mm2 * factor, dp);
  }

  function unitSuffix() {
    return getSelectedUnit();
  }

  function unitAreaSuffix() {
    const unit = getSelectedUnit();
    return unit === 'in' ? 'in²' : 'm²';
  }

  function convertInputValues(fromUnit, toUnit) {
    const factor = fromUnit === 'mm' && toUnit === 'in' ? 1 / 25.41 : (fromUnit === 'in' && toUnit === 'mm' ? 25.41 : 1);
    const inputs = [
      ...availRows.querySelectorAll('.avail-w, .avail-h'),
      ...reqRows.querySelectorAll('.req-w, .req-h'),
      bladeInput,
      offsetInput
    ].filter(el => el && Number.isFinite(Number(el.value)));
    inputs.forEach(input => {
      const value = Number(input.value);
      input.value = fmt(value * factor, toUnit === 'in' ? 2 : 0);
    });
  }

  unitSelect?.addEventListener('change', () => {
    const newUnit = getSelectedUnit();
    if (newUnit !== lastUnit) {
      convertInputValues(lastUnit, newUnit);
      lastUnit = newUnit;
      render();
    }
  });

  function updateUnitsUIBadges() {
    const u = unitSuffix();
    document.querySelectorAll('.unit').forEach(el => { el.textContent = u; });
  }

  function readAvailable() {
    const rows = [...availRows.querySelectorAll('.available-row')];
    const out = [];
    const factor = 1 / mmToUnitFactor(getSelectedUnit()); 
    for (const r of rows) {
      const w = Number(r.querySelector('.avail-w').value) * factor;
      const h = Number(r.querySelector('.avail-h').value) * factor;
      const q = Number(r.querySelector('.avail-q').value);
      if (Number.isFinite(w) && Number.isFinite(h) && Number.isFinite(q) && q > 0 && w > 0 && h > 0) {
        out.push({ width: w, height: h, quantity: Math.max(1, Math.floor(q)) });
      }
    }
    return out;
  }

  function readRequired() {
    const rows = [...reqRows.querySelectorAll('.required-row')];
    const out = [];
    const factor = 1 / mmToUnitFactor(getSelectedUnit()); 
    for (const r of rows) {
      const w = Number(r.querySelector('.req-w').value) * factor;
      const h = Number(r.querySelector('.req-h').value) * factor;
      const q = Number(r.querySelector('.req-q').value);
      if (Number.isFinite(w) && Number.isFinite(h) && Number.isFinite(q) && q > 0 && w > 0 && h > 0) {
        out.push({ width: w, height: h, quantity: Math.max(1, Math.floor(q)), label: '' || `${fmtLenFromMM(w)} × ${fmtLenFromMM(h)}` });
      }
    }
    return out;
  }

function solveCSP(available, required, opts = {}) {
    const kerf = Math.max(0, Number.isFinite(opts.kerf) ? opts.kerf : 0);
    const GHOST_KERF = kerf;
    const userEdge = Math.max(0, Number.isFinite(opts.edgeClearance) ? opts.edgeClearance : 0);
    const effectiveEdge = userEdge;
    const allowRotate = opts.allowRotate ?? true;
    const unitName = opts.unitName ?? 'mm';

    const EPS = 1e-5;

    let largestSheet = { width: 0, height: 0 };
    let maxInnerArea = 0;
    for (const sheet of available) {
        const { W, H } = innerDims(sheet);
        const innerArea = W * H;
        if (innerArea > maxInnerArea) {
            maxInnerArea = innerArea;
            largestSheet = { width: sheet.width, height: sheet.height };
        }
    }

    const oversizedItems = [];
    for (const r of required) {
        const w = r.width; 
        const h = r.height; 
        let fits = false;
        for (const sheet of available) {
            const { W, H } = innerDims(sheet);
            if (allowRotate) {
                if ((w <= W && h <= H) || (h <= W && w <= H)) {
                    fits = true;
                    break;
                }
            } else {
                if (w <= W && h <= H) {
                    fits = true;
                    break;
                }
            }
        }
   if (!fits) {
    oversizedItems.push(`${fmtLenFromMM(r.width)} × ${fmtLenFromMM(r.height)}${unitName}`);
}
    }

if (oversizedItems.length > 0) {
    const warningMsg = `⚠️ ${oversizedItems.join(', ')} ${oversizedItems.length > 1 ? 'are' : 'is'} too large for the available sheet size and ${oversizedItems.length > 1 ? 'have' : 'has'} been excluded from the layout. Please remove this sheet or the edge offset.`;
    
    required = required.filter(r => {
        const w = r.width;
        const h = r.height;
        for (const sheet of available) {
            const { W, H } = innerDims(sheet);
            if (allowRotate) {
                if ((w <= W && h <= H) || (h <= W && w <= H)) {
                    return true;
                }
            } else {
                if (w <= W && h <= H) {
                    return true;
                }
            }
        }
        return false;
    });
    
    if (required.length === 0) {
        const blank = makeBlankSolutionFromAvailable(available, unitName);
        blank.meta = {
            kerf,
            edgeClearance: effectiveEdge,
            allowRotate,
            requiredTotals: [],
            placedByBase: [],
            unplaced: [],
            warnings: [warningMsg],
            notes: []
        };
        return blank;
    }
    
    var pendingWarning = warningMsg;
}

    const items = [];
    const reqTotals = new Map();
    const counters = new Map();
    for (const r of required) {
      const q = Math.max(1, r.quantity | 0);
      const base = r.label ?? `${fmtLenFromMM(r.width)}x${fmtLenFromMM(r.height)}`;
      const start = counters.get(base) ?? 1;
      for (let i = 0; i < q; i++) {
        const idx = start + i;
        const label = q > 1 ? `${base} #${idx}` : base;
        items.push({ w: r.width, h: r.height, base, label });
      }
      counters.set(base, start + q);
      reqTotals.set(base, (reqTotals.get(base) || 0) + q);
    }

    function innerDims(sheet) {
      return {
        x0: effectiveEdge,
        y0: effectiveEdge,
        W: Math.max(0, sheet.width - 2 * effectiveEdge),
        H: Math.max(0, sheet.height - 2 * effectiveEdge)
      };
    }

    const sheetDims = available.map(sheet => innerDims(sheet));

    const packItems = items.map(it => {
      let kerfW = GHOST_KERF;
      let kerfH = GHOST_KERF;

      for (const { W, H } of sheetDims) {
        if (Math.abs(it.w - W) <= EPS) kerfW = 0;
        if (Math.abs(it.h - H) <= EPS) kerfH = 0;
        if (allowRotate) {
          if (Math.abs(it.w - H) <= EPS) kerfW = 0;
          if (Math.abs(it.h - W) <= EPS) kerfH = 0;
        }
      }

      return {
        ...it,
        w: it.w + kerfW,
        h: it.h + kerfH,
        origW: it.w,
        origH: it.h
      };
    });

    function scoreFragmentation(freeRects) {
      let perim = 0;
      for (const fr of freeRects) perim += 2 * (fr.w + fr.h);
      return freeRects.length * 100000 + perim;
    }

    class MaxRectsBin {
      constructor(width, height) {
        this.W = width; this.H = height;
        const { x0, y0, W: innerW, H: innerH } = innerDims({ width, height });
        const kerf = GHOST_KERF;
        const halfKerf = kerf / 2;
        const expX0 = x0 - halfKerf;
        const expY0 = y0 - halfKerf;
        const expW = innerW + kerf;
        const expH = innerH + kerf;
        this.edge = { x0: expX0, y0: expY0, W: expW, H: expH };
        this.free = (expW > 0 && expH > 0) ? [{ x: expX0, y: expY0, w: expW, h: expH }] : [];
        this.used = [];
        this.gu = [];
        this.EPS = EPS;
      }
      _contactScore(x, y, w, h) {
        let score = 0;
        for (const u of this.gu) {
          if (Math.abs(u.x + u.w - x) <= this.EPS && !(u.y >= y + h || y >= u.y + u.h)) score += h;
          if (Math.abs(x + w - u.x) <= this.EPS && !(u.y >= y + h || y >= u.y + u.h)) score += h;
          if (Math.abs(u.y + u.h - y) <= this.EPS && !(u.x >= x + w || x >= u.x + u.w)) score += w;
          if (Math.abs(y + h - u.y) <= this.EPS && !(u.x >= x + w || x >= u.x + u.w)) score += w;
        }
        if (Math.abs(x - this.edge.x0) <= this.EPS) score += h;
        if (Math.abs(y - this.edge.y0) <= this.EPS) score += w;
        if (Math.abs(this.edge.x0 + this.edge.W - (x + w)) <= this.EPS) score += h;
        if (Math.abs(this.edge.y0 + this.edge.H - (y + h)) <= this.EPS) score += w;
        return score;
      }
      _findNode(w, h) {
        let best = null;
        const consider = (fr, rw, rh, rotated) => {
          if (rw > fr.w + this.EPS || rh > fr.h + this.EPS) return;
          const x = fr.x, y = fr.y;
          const tuple = [-this._contactScore(x, y, rw, rh), (fr.w * fr.h) - (rw * rh), y, x];
          const cand = { x, y, w: rw, h: rh, rotated, tuple };
          if (!best) { best = cand; return; }
          const t = cand.tuple, u = best.tuple;
          for (let i = 0; i < t.length; i++) {
            if (t[i] < u[i] - this.EPS) { best = cand; return; }
            if (t[i] > u[i] + this.EPS) return;
          }
        };
        for (const fr of this.free) {
          consider(fr, w, h, false);
          if (allowRotate) consider(fr, h, w, true);
        }
        return best;
      }
      insert(wInfl, hInfl, label, base, origW, origH) {
        const node = this._findNode(wInfl, hInfl);
        if (!node) return false;
        this._place(node);
        const gx = node.x, gy = node.y, gw = node.w, gh = node.h;
        this.gu.push({ x: gx, y: gy, w: gw, h: gh, base });
        const halfKerf = GHOST_KERF / 2;
        const px = gx + halfKerf;
        const py = gy + halfKerf;
        const pw = node.rotated ? origH : origW;
        const ph = node.rotated ? origW : origH;
        const originalW = pw;
        const originalH = ph;
        this.used.push({ x: px, y: py, w: pw, h: ph, label, base, rotated: !!node.rotated, gx, gy, gw, gh, originalW, originalH });
        return true;
      }
      _place(used) {
        let i = 0;
        while (i < this.free.length) {
          const fr = this.free[i];
          if (!this._splitFreeNode(fr, used)) i++;
          else this.free.splice(i, 1);
        }
        this._pruneFreeList();
        this._mergeFreeList();
      }
      _splitFreeNode(fr, used) {
        const x1 = used.x, y1 = used.y, x2 = used.x + used.w, y2 = used.y + used.h;
        const fx1 = fr.x, fy1 = fr.y, fx2 = fr.x + fr.w, fy2 = fr.y + fr.h;
        if (x2 <= fx1 + this.EPS || x1 >= fx2 - this.EPS || y2 <= fy1 + this.EPS || y1 >= fy2 - this.EPS) return false;
        if (x1 > fx1 + this.EPS) this.free.push({ x: fx1, y: fy1, w: x1 - fx1, h: fr.h });
        if (x2 < fx2 - this.EPS) this.free.push({ x: x2, y: fy1, w: fx2 - x2, h: fr.h });
        const ox1 = Math.max(fx1, x1), ox2 = Math.min(fx2, x2);
        if (y1 > fy1 + this.EPS) this.free.push({ x: ox1, y: fy1, w: Math.max(0, ox2 - ox1), h: y1 - fy1 });
        if (y2 < fy2 - this.EPS) this.free.push({ x: ox1, y: y2, w: Math.max(0, ox2 - ox1), h: fy2 - y2 });
        return true;
      }
      _pruneFreeList() {
        this.free = this.free.filter(r => r.w > this.EPS && r.h > this.EPS);
        for (let i = 0; i < this.free.length; i++) {
          for (let j = i + 1; j < this.free.length; j++) {
            const a = this.free[i], b = this.free[j];
            if (!a || !b) continue;
            if (a.x >= b.x - this.EPS && a.y >= b.y - this.EPS &&
                a.x + a.w <= b.x + b.w + this.EPS &&
                a.y + a.h <= b.y + b.h + this.EPS) { this.free.splice(i, 1); i--; break; }
            if (b.x >= a.x - this.EPS && b.y >= a.y - this.EPS &&
                b.x + b.w <= a.x + a.w + this.EPS &&
                b.y + b.h <= a.y + a.h + this.EPS) { this.free.splice(j, 1); j--; }
          }
        }
      }
      _mergeFreeList() {
        let merged = true;
        while (merged) {
          merged = false;
          outer: for (let i = 0; i < this.free.length; i++) {
            for (let j = i + 1; j < this.free.length; j++) {
              const a = this.free[i], b = this.free[j];
              if (Math.abs(a.y - b.y) <= this.EPS && Math.abs(a.h - b.h) <= this.EPS) {
                if (Math.abs(a.x + a.w - b.x) <= this.EPS) { this.free[i] = { x: a.x, y: a.y, w: a.w + b.w, h: a.h }; this.free.splice(j, 1); merged = true; break outer; }
                if (Math.abs(b.x + b.w - a.x) <= this.EPS) { this.free[i] = { x: b.x, y: b.y, w: b.w + a.w, h: a.h }; this.free.splice(j, 1); merged = true; break outer; }
              }
              if (Math.abs(a.x - b.x) <= this.EPS && Math.abs(a.w - b.w) <= this.EPS) {
                if (Math.abs(a.y + a.h - b.y) <= this.EPS) { this.free[i] = { x: a.x, y: a.y, w: a.w, h: a.h + b.h }; this.free.splice(j, 1); merged = true; break outer; }
                if (Math.abs(b.y + b.h - a.y) <= this.EPS) { this.free[i] = { x: b.x, y: b.y, w: a.w, h: b.h + a.h }; this.free.splice(j, 1); merged = true; break outer; }
              }
            }
          }
        }
      }
    }

    function packMaxRects(basePool, itemsList) {
    function chooseSheet(poolArr, it, bins) {
        let best = -1, bestArea = Infinity;
        for (let i = 0; i < poolArr.length; i++) {
            const s = poolArr[i];
            const { W, H } = innerDims(s);
            if ((it.w <= W && it.h <= H) || (allowRotate && it.h <= W && it.w <= H)) {
                const area = W * H;
                const usedCount = bins.filter(b => b.W === s.width && b.H === s.height).length;
                const penalty = usedCount * 1000000;
                if (area + penalty < bestArea) {
                    bestArea = area + penalty;
                    best = i;
                }
            }
        }
        return best;
    }

    const sortStrategies = [
        (a, b) => (b.w * b.h) - (a.w * a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h),
        (a, b) => (b.w + b.h) - (a.w + a.h) || (b.w * b.h) - (a.w * a.h),
        (a, b) => b.w - a.w || b.h - a.h
    ];

    let bestResult = null;
    let minUnplaced = Infinity;

    for (const sortFn of sortStrategies) {
        const pool = basePool.map(p => ({ ...p }));
        const bins = [];
        const L = itemsList.map(o => ({ ...o }));
        L.sort(sortFn);
        const unplaced = [];

        for (const it of L) {
            let placed = false;
            for (const bin of bins) {
                if (bin.insert(it.w, it.h, it.label, it.base, it.origW, it.origH)) {
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                let idx = chooseSheet(pool, it, bins);
                if (idx < 0 && pool.length > 0) {
                    idx = pool.reduce((best, s, i) => {
                        const { W, H } = innerDims(s);
                        const area = W * H;
                        return area > (innerDims(pool[best] || { width: 0, height: 0 }).W * innerDims(pool[best] || { width: 0, height: 0 }).H) ? i : best;
                    }, 0);
                }
                if (idx >= 0) {
                    const s = pool.splice(idx, 1)[0];
                    const bin = new MaxRectsBin(s.width, s.height);
                    const ok = bin.insert(it.w, it.h, it.label, it.base, it.origW, it.origH);
                    if (ok) {
                        bins.push(bin);
                        placed = true;
                    } else {
                        unplaced.push(it);
                        console.warn(`Failed to place ${it.label} (${it.w}x${it.h}) on sheet ${s.width}x${s.height}`);
                    }
                } else {
                    unplaced.push(it);
                    console.warn(`No suitable sheet for ${it.label} (${it.w}x${it.h})`);
                }
            }
        }

        if (unplaced.length < minUnplaced) {
            minUnplaced = unplaced.length;
            let nextId = 1;
            const sheets = bins.filter(b => b.used.length > 0).map(b => ({
                id: nextId++,
                width: b.W,
                height: b.H,
                placements: b.used
            }));
            const innerA = (w, h) => Math.max(0, w - 2 * effectiveEdge) * Math.max(0, h - 2 * effectiveEdge);
            let usedInner = 0, usedArea = 0;
            for (const sh of sheets) {
                const fill = sh.placements.reduce((a, p) => a + p.w * p.h, 0);
                usedInner += innerA(sh.width, sh.height);
                usedArea += fill;
            }
            const frag = bins.reduce((acc, b) => acc + scoreFragmentation(b.free), 0);
            const placedByBase = new Map();
            for (const sh of sheets) for (const p of sh.placements) placedByBase.set(p.base, (placedByBase.get(p.base) || 0) + 1);
            bestResult = {
                sheets,
                waste: Math.max(0, usedInner - usedArea),
                unplaced,
                frag,
                placedByBase: Array.from(placedByBase, ([base, qty]) => ({ base, qty }))
            };
        }

        if (minUnplaced === 0) break;
    }

    if (bestResult.unplaced.length > 0 && basePool.length > bestResult.sheets.length) {
        console.warn(`Retrying with additional sheet due to ${bestResult.unplaced.length} unplaced items`);
        const newPool = basePool.map(p => ({ ...p }));
        const newItems = bestResult.unplaced.map(o => ({ ...o }));
        const additionalResult = packMaxRects(newPool, newItems);
        let nextId = bestResult.sheets.length + 1;
        const additionalSheets = additionalResult.sheets.map(s => ({
            id: nextId++,
            width: s.width,
            height: s.height,
            placements: s.placements
        }));
        bestResult.sheets.push(...additionalSheets);
        bestResult.unplaced = additionalResult.unplaced;
        bestResult.waste += additionalResult.waste;
        bestResult.frag += additionalResult.frag;
        const placedByBase = new Map(bestResult.placedByBase.map(({ base, qty }) => [base, qty]));
        for (const { base, qty } of additionalResult.placedByBase) {
            placedByBase.set(base, (placedByBase.get(base) || 0) + qty);
        }
        bestResult.placedByBase = Array.from(placedByBase, ([base, qty]) => ({ base, qty }));
    }

    if (bestResult.unplaced.length > 0) {
        console.warn(`Final unplaced items:`, bestResult.unplaced);
    }

    return bestResult;
}
    const basePool = [];
    available.forEach((s) => {
      const q = Math.max(1, s.quantity | 0);
      for (let k = 0; k < q; k++) basePool.push({ width: s.width, height: s.height });
    });

    const packed = packMaxRects(basePool, packItems);

    packed.sheets.sort((a, b) => (b.placements.length > 0) - (a.placements.length > 0));

   return {
    unitName,
    sheets: packed.sheets,
    meta: {
        kerf,
        edgeClearance: effectiveEdge,
        allowRotate,
        requiredTotals: Array.from(reqTotals, ([base, qty]) => ({ base, qty })),
        placedByBase: packed.placedByBase,
        unplaced: (packed.unplaced || []).map(u => ({
            w: Math.max(0, u.origW),
            h: Math.max(0, u.origH),
            label: u.label,
            base: u.base
        })),
        warnings: typeof pendingWarning !== 'undefined' ? [pendingWarning] : [],
        notes: []
    }
};
}

function drawSolution(ctx, width, height, solution, opts = {}) {
    const margin = opts.margin ?? 20;
    const gutter = opts.gutter ?? 20;
    const flipY = opts.flipY ?? true;
    const showGrid = opts.showGrid ?? false;
    const gridTargetPx = opts.gridTargetPx ?? 12;
    const updateKeys = opts.updateKeys ?? true;
    const annotateSheetDims = !!opts.annotateSheetDims;

    const required = Array.isArray(opts.required) ? opts.required : [];
    const counts = new Map();
    const baseLabels = [];

    if (required.length) {
        for (const r of required) {
            const base = r.label ?? `${fmtLenFromMM(r.width)}x${fmtLenFromMM(r.height)}`;
            if (!counts.has(base)) baseLabels.push(base);
            counts.set(base, (counts.get(base) || 0) + Math.max(1, r.quantity | 0));
        }
    } else {
        for (const s of solution.sheets) for (const p of s.placements) {
            const base = (p.label || '').split(' #')[0];
            if (!counts.has(base)) baseLabels.push(base);
            counts.set(base, (counts.get(base) || 0) + 1);
        }
    }

    const labelColors = new Map();
    for (let i = 0; i < baseLabels.length; i++) {
        const hue = (i * 137.508) % 360;
        labelColors.set(baseLabels[i], `hsl(${hue} 65% 55%)`);
    }

    const keysDiv = document.getElementById('keys');
    if (keysDiv && updateKeys) {
        keysDiv.innerHTML = '';
        const col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.gap = '4px';
        col.style.color = 'white';
        for (const label of baseLabels) {
            const color = labelColors.get(label);
            const row = document.createElement('div');
            row.style.backgroundColor = color;
            row.style.padding = '6px';
            row.style.borderRadius = '4px';
            row.style.color = 'white !important';
            row.innerHTML = `<strong>${label}</strong> (x${counts.get(label) || 0})`;
            col.appendChild(row);
        }
        keysDiv.appendChild(col);
    }

    const sheetBoxes = [];
    const drawableW = width - 2 * margin;
    const drawableH = height - 2 * margin;
    for (const sheet of solution.sheets) {
        const sx = drawableW / sheet.width;
        const sy = drawableH / sheet.height;
        const scale = Math.min(sx, sy);
        sheetBoxes.push({ sheet, wPx: sheet.width * scale, hPx: sheet.height * scale, scale });
    }
    const totalH = sheetBoxes.reduce((a, b, i) => a + b.hPx + (i ? gutter : 0), 0);
    const uniformScale = totalH + 2 * margin > height
        ? (height - 2 * margin - (sheetBoxes.length - 1) * gutter) /
          sheetBoxes.reduce((a, b) => a + b.hPx, 0)
        : 1;

    ctx.lineWidth = 1;
    ctx.font = '12px';

    let capturedGrid = false;
    let cursorY = margin;

    for (const box of sheetBoxes) {
        const scale = box.scale * uniformScale;
        const drawW = box.sheet.width * scale;
        const drawH = box.sheet.height * scale;
        const originX = (width - drawW) / 2;
        const originY = cursorY;

        if (!capturedGrid) {
            window.__LAST_GRID_META__ = {
                cols: box.sheet.width,
                rows: box.sheet.height,
                scale,
                boardW: drawW,
                boardH: drawH,
            };
            capturedGrid = true;
        }

        if (showGrid) {
            const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
            let minor = nice[0];
            for (const n of nice) { if (n * scale >= gridTargetPx) { minor = n; break; } }
            const maxLines = 2000;
            const est = (box.sheet.width / minor) + (box.sheet.height / minor);
            if (est > maxLines) { const f = Math.ceil(est / maxLines); minor *= f; }
            const major = minor * (minor >= 50 ? 2 : 5);

            ctx.save();
            ctx.beginPath();
            for (let gx = 0; gx <= box.sheet.width + 1e-9; gx += minor) {
                const x = originX + gx * scale;
                ctx.moveTo(x, originY);
                ctx.lineTo(x, originY + drawH);
            }
            for (let gy = 0; gy <= box.sheet.height + 1e-9; gy += minor) {
                const y = originY + gy * scale;
                ctx.moveTo(originX, y);
                ctx.lineTo(originX + drawW, y);
            }
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            for (let gx = 0; gx <= box.sheet.width + 1e-9; gx += major) {
                const x = originX + gx * scale;
                ctx.moveTo(x, originY);
                ctx.lineTo(x, originY + drawH);
            }
            for (let gy = 0; gy <= box.sheet.height + 1e-9; gy += major) {
                const y = originY + gy * scale;
                ctx.moveTo(originX, y);
                ctx.lineTo(originX + drawW, y);
            }
            ctx.strokeStyle = '#bdbdbd';
            ctx.lineWidth = 1.25;
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(originX, originY, drawW, drawH);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(originX, originY, drawW, drawH);
        ctx.clip();

        for (const p of box.sheet.placements) {
            const px = originX + p.x * scale;
            const py = flipY ? originY + (box.sheet.height - p.y - p.h) * scale : originY + p.y * scale;
            const pw = p.w * scale;
            const ph = p.h * scale;
            const base = (p.label || '').split(' #')[0];

            ctx.fillStyle = labelColors.get(base) || '#6fa8dc';
            ctx.fillRect(px, py, pw, ph);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, py, pw, ph);

            const showWidthDimension = p.w >= MIN_DIMENSION_VISIBILITY_MM;
            const showHeightDimension = p.h >= MIN_DIMENSION_VISIBILITY_MM;

            const wText = fmtLenFromMM(p.w);
            const hText = fmtLenFromMM(p.h);

            const fontPx = Math.max(8, Math.min(12, Math.floor(Math.min(pw, ph) / 5)));
            ctx.save();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${fontPx}px`;

  
            if (showWidthDimension) {
    ctx.save();
    
    const inset = 2; 
    const wX = px + pw / 2;     
    const wY = py + inset + 0;   
    
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    const fontPx = Math.max(8, Math.min(12, Math.floor(Math.min(pw, ph) / 5)));
    ctx.font = `bold ${fontPx}px`;
    ctx.strokeText(wText, wX, wY);
    ctx.fillText(wText, wX, wY);

    ctx.restore();
}


if (showHeightDimension) {
    ctx.save();

    const inset = 6; 
    const hX = px + pw - inset;  
    const hY = py + ph / 2;  

    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();

    ctx.translate(hX, hY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    const fontPx = Math.max(8, Math.min(12, Math.floor(Math.min(pw, ph) / 5)));
    ctx.font = `bold ${fontPx}px`;
    ctx.strokeText(hText, 0, 0);
    ctx.fillText(hText, 0, 0);

    ctx.restore();
}
            ctx.restore();
        }
        ctx.restore();

        if (annotateSheetDims) {
            const u = unitSuffix();
            const widthLabel = `${fmtLenFromMM(box.sheet.width)} ${u}`;
            const heightLabel = `${fmtLenFromMM(box.sheet.height)} ${u}`;

            ctx.save();
            ctx.fillStyle = '#222';
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 3;
            ctx.font = 'bold 12px';

            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const topY = Math.max(0, originY - 6);
            ctx.strokeText(widthLabel, originX + drawW / 2, topY);
            ctx.fillText(widthLabel, originX + drawW / 2, topY);

            ctx.save();
            ctx.translate(originX + drawW + 6, originY + drawH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeText(heightLabel, 0, 0);
            ctx.fillText(heightLabel, 0, 0);
            ctx.restore();

            ctx.restore();
        }

        cursorY += drawH + gutter;
    }
}
  function ensureHiDPIFor(cnv) {
    const rect = cnv.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const displayWidth = Math.floor(rect.width * dpr);
    const displayHeight = Math.floor(rect.height * dpr);
    if (cnv.width !== displayWidth || cnv.height !== displayHeight) {
      cnv.width = displayWidth;
      cnv.height = displayHeight;
    }
    const ctx = cnv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, cssW: Math.floor(rect.width), cssH: Math.floor(rect.height), dpr };
  }

  function clearCanvas(ctx) {
    const c = ctx.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
  }

  function drawSingleSheet(ctx, width, height, fullSolution, sheet, opts = {}) {
    const one = { sheets: [sheet], unitName: fullSolution.unitName };
    drawSolution(ctx, width, height, one, opts);
}

  function makeBlankSolutionFromAvailable(available, unit = 'mm') {
    let id = 1;
    const sheets = [];
    for (const s of available) {
      const q = Math.max(1, s.quantity | 0);
      for (let i = 0; i < q; i++) {
        sheets.push({ id: id++, width: s.width, height: s.height, placements: [] });
      }
    }
    return { sheets, unitName: unit, meta: { kerf: 0, edgeClearance: 0, allowRotate: true, requiredTotals: [], placedByBase: [], unplaced: [] } };
  }

  function fmt(n, dp = 2) {
    if (!Number.isFinite(n)) return String(n);
    return Number(n.toFixed(dp));
  }

  function computeStats(solution, available, required, metaNote = '') {
    const res = {
        timestamp: new Date().toISOString(),
        unit: solution.unitName || 'mm',
        kerf: solution.meta?.kerf ?? null,
        edgeClearance: solution.meta?.edgeClearance ?? null,
        allowRotate: solution.meta?.allowRotate ?? null,
        sheets_total: solution.sheets.length,
        sheets_used_nonempty: solution.sheets.filter(s => s.placements.length > 0).length,
        sheet_ids: solution.sheets.map(s => s.id),
        totals: {},
        by_label: [],
        per_sheet: [],
        warnings: solution.meta?.warnings || [],
        notes: metaNote ? [metaNote] : []
    };

    const innerArea = (w, h, edge) => Math.max(0, (w - 2 * edge)) * Math.max(0, (h - 2 * edge));

    let sumSheetArea = 0, sumInnerArea = 0, sumUsedArea = 0, sumPlacements = 0;
    for (const s of solution.sheets) {
        const sheetArea = s.width * s.height;
        const innerA = innerArea(s.width, s.height, res.edgeClearance || 0);
        const usedA = s.placements.reduce((a, p) => a + p.w * p.h, 0);
        const usedCount = s.placements.length;
        sumSheetArea += sheetArea;
        sumInnerArea += innerA;
        sumUsedArea += usedA;
        sumPlacements += usedCount;

        const labelCounts = new Map();
        for (const p of s.placements) {
            const base = p.base || (p.label || '').split(' #')[0];
            labelCounts.set(base, (labelCounts.get(base) || 0) + 1);
        }

        res.per_sheet.push({
            id: s.id,
            width: s.width,
            height: s.height,
            area_total: sheetArea,
            area_inner: innerA,
            area_used: usedA,
            area_waste_inner: Math.max(0, innerA - usedA),
            utilisation_inner_pct: innerA > 0 ? (usedA / innerA) * 100 : 0,
            placements: usedCount,
            label_breakdown: Array.from(labelCounts.entries()).map(([base, qty]) => ({ base, qty }))
        });
    }

    res.totals = {
        pieces_required: required.reduce((a, r) => a + Math.max(1, r.quantity | 0), 0),
        pieces_placed: sumPlacements,
        pieces_unplaced: Math.max(0, required.reduce((a, r) => a + Math.max(1, r.quantity | 0), 0) - sumPlacements),
        area_sheet_total: sumSheetArea,
        area_inner_total: sumInnerArea,
        area_used_total: sumUsedArea,
        area_waste_inner_total: Math.max(0, sumInnerArea - sumUsedArea),
        utilisation_inner_total_pct: sumInnerArea > 0 ? (sumUsedArea / sumInnerArea) * 100 : 0
    };

    const reqByBase = new Map();
    for (const r of required) {
        const base = r.label ?? `${fmtLenFromMM(r.width)}x${fmtLenFromMM(r.height)}`;
        reqByBase.set(base, (reqByBase.get(base) || 0) + Math.max(1, r.quantity | 0));
    }
    const placedByBase = new Map();
    for (const s of solution.sheets) for (const p of s.placements) {
        const base = p.base || (p.label || '').split(' #')[0];
        placedByBase.set(base, (placedByBase.get(base) || 0) + 1);
    }
    const allBases = new Set([...reqByBase.keys(), ...placedByBase.keys()]);
    for (const base of allBases) {
        const req = reqByBase.get(base) || 0;
        const plc = placedByBase.get(base) || 0;
        res.by_label.push({ base, required: req, placed: plc, unplaced: Math.max(0, req - plc) });
    }

    return res;
}

function injectResults(stats, selectedId, available) {
    const el = document.getElementById('results');
    if (!el) return;
    el.innerHTML = '';

    const u = unitSuffix();
    const u2 = unitAreaSuffix();

    const warningEl = document.getElementById('warning-message');
    if (warningEl) {
        const unplacedCount = stats?.totals?.pieces_unplaced || 0;
        const warnings = stats?.warnings || [];
        if (warnings.length > 0) {
            warningEl.style.display = 'block';
            warningEl.textContent = warnings.join(' | ');
        } else if (unplacedCount > 0) {
            warningEl.style.display = 'block';
            warningEl.textContent = `⚠️ ${unplacedCount} piece${unplacedCount > 1 ? 's' : ''} could not be placed. More available sheets are required to complete the process.`;
        } else {
            warningEl.style.display = 'none';
        }
    }

    function makePanel(title, pairs) {
        const card = document.createElement('section');
        card.className = 'stats-card';
        const head = document.createElement('div');
        head.className = 'stats-card__header';
        head.textContent = title;
        card.appendChild(head);
        const grid = document.createElement('div');
        grid.className = 'stats-grid';
        card.appendChild(grid);
        pairs.forEach(([k, v]) => {
            const K = document.createElement('div');
            K.className = 'k';
            K.textContent = k;
            const V = document.createElement('div');
            V.className = 'v';
            V.textContent = v;
            grid.appendChild(K);
            grid.appendChild(V);
        });
        return card;
    }

    const t = stats.totals;
    const totalPairs = [
        ['Sheets (Used / Total):', `${stats.sheets_used_nonempty} / ${stats.sheets_total}`],
        ['Number of Parts:', String(t.pieces_placed)],
        ['Parts Unplaced:', String(t.pieces_unplaced)],
        ['Square of Parts:', `${fmtAreaFromMM2(t.area_used_total)} ${u2}`],
        ['Usable Area (Inner):', `${fmtAreaFromMM2(t.area_inner_total)} ${u2}`],
        ['Square of Waste:', `${fmtAreaFromMM2(t.area_waste_inner_total)} ${u2}`],
        ['Utilisation:', `${fmt(t.utilisation_inner_total_pct)} %`],
        ['Kerf / Edge:', `${fmtLenFromMM(stats.kerf || 0)} ${u} / ${fmtLenFromMM(stats.edgeClearance || 0)} ${u}`],
    ];
    el.appendChild(makePanel('Total', totalPairs));

    const usedSheets = new Map();
    stats.per_sheet.forEach(s => {
        const key = `${s.width}x${s.height}`;
        usedSheets.set(key, (usedSheets.get(key) || 0) + (s.placements.length > 0 ? 1 : 0));
    });

    const sheetSummary = new Map();
    available.forEach(s => {
        const key = `${s.width}x${s.height}`;
        sheetSummary.set(key, (sheetSummary.get(key) || 0) + Math.max(1, s.quantity | 0));
    });

    const availPairs = [];
    sheetSummary.forEach((quantity, key) => {
        const [width, height] = key.split('x').map(Number);
        const usedCount = usedSheets.get(key) || 0;
        const status = usedCount > 0 ? `Used: ${usedCount}` : 'Unused';
        availPairs.push([
            `Sheet: ${fmtLenFromMM(width)} × ${fmtLenFromMM(height)}${u}`,
            `Quantity: ${quantity}`
        ]);
    });

    availPairs.sort((a, b) => {
        const [w1, h1] = a[0].match(/(\d+) × (\d+)/).slice(1).map(Number);
        const [w2, h2] = b[0].match(/(\d+) × (\d+)/).slice(1).map(Number);
        return (w1 * h1) - (w2 * h2) || w1 - w2;
    });

    el.appendChild(makePanel('Available Sheets', availPairs));

    const chosen = stats.per_sheet.find(s => s.id === selectedId) || stats.per_sheet[0];
    if (chosen) {
        const sheetPairs = [
            ['Sheet Size:', `${fmtLenFromMM(chosen.width)} × ${fmtLenFromMM(chosen.height)} ${u}`],
            ['Number of Parts:', String(chosen.placements)],
            ['Square of Sheet (Usable):', `${fmtAreaFromMM2(chosen.area_inner)} ${u2}`],
            ['Square of Parts:', `${fmtAreaFromMM2(chosen.area_used)} ${u2}`],
            ['Square of Waste:', `${fmtAreaFromMM2(chosen.area_waste_inner)} ${u2}`],
            ['Utilisation:', `${fmt(chosen.utilisation_inner_pct)} %`],
        ];
        el.appendChild(makePanel(`Sheet ${chosen.id}`, sheetPairs));
    } else {
        const note = document.createElement('div');
        note.className = 'stats-note';
        note.textContent = 'No sheet data available for selection.';
        el.appendChild(note);
    }

    if (stats.notes?.length) {
        const note = document.createElement('div');
        note.className = 'stats-note';
        note.textContent = stats.notes.join(' | ');
        el.appendChild(note);
    }

  }

  let lastSolution = null;
  let selectedSheetId = null;
  let lastStats = null;
  let lastAvailable = null;

  function highlightSelection() {
    if (!previewsDiv) return;
    previewsDiv.querySelectorAll('.sheet-preview').forEach(el => {
      const isSel = Number(el.dataset.sheetId) === Number(selectedSheetId);
      if (isSel) el.classList.add('selected'); else el.classList.remove('selected');
    });
  }

  function buildPreviews(solution) {
    if (!previewsDiv) return;
    previewsDiv.innerHTML = '';
    for (const sheet of solution.sheets) {
      const wrapper = document.createElement('div');
      wrapper.className = 'sheet-preview';
      wrapper.dataset.sheetId = String(sheet.id);

      const tag = document.createElement('span');
      tag.className = 'size-tag';
      const u = unitSuffix();
      tag.textContent = `Sheet ${sheet.id} (${fmtLenFromMM(sheet.width)}×${fmtLenFromMM(sheet.height)} ${u})`;
      wrapper.appendChild(tag);

      const thumb = document.createElement('canvas');
      thumb.style.width = '100%';
      thumb.style.height = '130px';
      wrapper.appendChild(thumb);

      previewsDiv.appendChild(wrapper);

      const { ctx: tctx, cssW, cssH } = ensureHiDPIFor(thumb);
      drawSingleSheet(tctx, cssW, cssH, solution, sheet, {
        margin: 10, gutter: 0, flipY: true, showGrid: true,
        required: readRequired(), gridTargetPx: 8, updateKeys: false,
        annotateSheetDims: false
      });

      if (sheet.placements.length === 0) {
        tctx.save();
        tctx.beginPath();
        tctx.moveTo(0, 0);
        tctx.lineTo(cssW, cssH);
        tctx.strokeStyle = 'red';
        tctx.lineWidth = 3;
        tctx.stroke();
        tctx.restore();
      }

   wrapper.addEventListener('click', () => {
  selectedSheetId = sheet.id;
  view.scale = 1; view.offsetX = 0; view.offsetY = 0;
  drawMain();
  highlightSelection();
  if (lastSolution && lastAvailable) {
    const stats = computeStats(lastSolution, lastAvailable, readRequired(), '');
    lastStats = stats;
    injectResults(stats, selectedSheetId, lastAvailable);
  }
});
    }
    highlightSelection();
  }

  function drawMain() {
    const mainDims = ensureHiDPIFor(canvas);
    const mctx = mainDims.ctx;

    clearCanvas(mctx);

    if (!lastSolution || !lastSolution.sheets.length) {
      const kd = document.getElementById('keys'); if (kd) kd.innerHTML = '';
      return;
    }

    const chosen = lastSolution.sheets.find(s => s.id === selectedSheetId) || lastSolution.sheets[0];
    selectedSheetId = chosen?.id ?? null;

    mctx.save();
    mctx.translate(view.offsetX, view.offsetY);
    mctx.scale(view.scale, view.scale);

    drawSingleSheet(mctx, mainDims.cssW, mainDims.cssH, lastSolution, chosen, {
      margin: 30, gutter: 0, flipY: true, showGrid: true,
      required: readRequired(), gridTargetPx: 12, updateKeys: true,
      annotateSheetDims: true
    });

    mctx.restore();
  }

 function render() {
  const mainDims = ensureHiDPIFor(canvas);
  const mctx = mainDims.ctx;

  const kerf = Number(bladeInput.value) * (1 / mmToUnitFactor(getSelectedUnit())) || 0;
  const offset = Number(offsetInput.value) * (1 / mmToUnitFactor(getSelectedUnit())) || 0;
  const userEdge = offset;
  const available = readAvailable();
  const required = readRequired();
  lastAvailable = available;
  const currentUnit = getSelectedUnit();
  updateUnitsUIBadges();

    if (!available.length) {
      clearCanvas(mctx);
      const kd = document.getElementById('keys'); if (kd) kd.innerHTML = '';
      if (previewsDiv) previewsDiv.innerHTML = '';
      lastSolution = null; selectedSheetId = null;

      const emptySol = { unitName: currentUnit, sheets: [], meta: { kerf, edgeClearance: userEdge, allowRotate: true } };
      const stats = computeStats(emptySol, available, required, 'No available sheets; nothing to draw');
      lastStats = stats; 
      injectResults(stats, selectedSheetId, available);
      return;
    }

    if (!required.length) {
      const blank = makeBlankSolutionFromAvailable(available, currentUnit);
      blank.meta.kerf = kerf;
      blank.meta.edgeClearance = userEdge;
      blank.meta.allowRotate = true;

      blank.sheets.sort((a, b) => {
        const aBlank = a.placements.length === 0;
        const bBlank = b.placements.length === 0;
        if (aBlank === bBlank) return 0;
        return aBlank ? 1 : -1;
      });

      lastSolution = blank;
      if (!selectedSheetId || !blank.sheets.some(s => s.id === selectedSheetId)) {
        selectedSheetId = blank.sheets[0]?.id ?? null;
      }
      buildPreviews(blank);
      drawMain();

      const stats = computeStats(blank, available, required, 'No dimensions currently provided.');
      lastStats = stats; injectResults(stats, selectedSheetId, available);
      return;
    }

   const solution = solveCSP(available, required, {
        kerf,
        edgeClearance: userEdge,
        allowRotate: true,
        unitName: currentUnit
    });

    const placedAny = solution.sheets.some(s => s.placements.length > 0);
    let toShow = solution;
    let note = '';
    if (!solution.sheets.length) {
        toShow = makeBlankSolutionFromAvailable(available, currentUnit);
        toShow.meta.kerf = kerf;
        toShow.meta.edgeClearance = userEdge;
        toShow.meta.allowRotate = true;
        note = 'No sheets generated';
    } else if (!placedAny) {
        note = 'No pieces placed under current constraints; showing available sheets';
    }

   toShow = makeBlankSolutionFromAvailable(available, currentUnit);
toShow.meta = solution.meta;

solution.sheets.forEach(solutionSheet => {
    const matchingSheet = toShow.sheets.find(s => 
        s.width === solutionSheet.width && 
        s.height === solutionSheet.height && 
        s.placements.length === 0
    );
    if (matchingSheet) {
        matchingSheet.placements = [...solutionSheet.placements];
    }
});

toShow.sheets.sort((a, b) => {
    const aBlank = a.placements.length === 0;
    const bBlank = b.placements.length === 0;
    if (aBlank === bBlank) return a.id - b.id;
    return aBlank ? 1 : -1;
});

    lastSolution = toShow;

    if (!selectedSheetId || !toShow.sheets.some(s => s.id === selectedSheetId)) {
      selectedSheetId = toShow.sheets[0]?.id ?? null;
    }

    buildPreviews(toShow);
    drawMain();

    const stats = computeStats(toShow, available, required, note);
    injectResults(stats, selectedSheetId, available);
  }

 
 function exportAllSheetsAsPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('jsPDF library failed to load. Please check your internet connection or try again later.');
        return;
    }

    if (!lastSolution || !lastSolution.sheets.length) {
        alert('No sheets available to export.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; 

    lastSolution.sheets.forEach((sheet, index) => {
        if (index > 0) {
            pdf.addPage();
        }

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const canvasWidth = 2400;
        const canvasHeight = 1800;
        
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        
        tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        drawSingleSheet(tempCtx, canvasWidth, canvasHeight, lastSolution, sheet, {
            margin: 80,
            gutter: 0,
            flipY: true,
            showGrid: true,
            required: readRequired(),
            gridTargetPx: 25,
            updateKeys: true,
            annotateSheetDims: true
        });

        const imgData = tempCanvas.toDataURL('image/png', 1.0);
        
        if (imgData === 'data:,') {
            console.error('Canvas is empty for sheet', sheet.id);
            alert(`Failed to render sheet ${sheet.id}. The canvas is empty.`);
            tempCanvas.remove();
            return;
        }

        const maxImgWidth = pageWidth - 2 * margin;
        const maxImgHeight = pageHeight - 2 * margin - 10;
        
        let imgWidth = maxImgWidth;
        let imgHeight = (canvasHeight / canvasWidth) * imgWidth;
        
        if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = (canvasWidth / canvasHeight) * imgHeight;
        }

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2 + 5;

        const u = unitSuffix();
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Sheet ${sheet.id} (${fmtLenFromMM(sheet.width)} × ${fmtLenFromMM(sheet.height)} ${u})`, pageWidth / 2, margin - 5, { align: 'center' });

        try {
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
        } catch (error) {
            console.error('Error adding image to PDF:', error);
            alert(`Failed to add sheet ${sheet.id} to PDF. The image may be too large.`);
        }

        tempCanvas.remove();
    });

    try {
        pdf.save('cutting-layout-all-sheets.pdf');
    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('Failed to save PDF. Please try again.');
    }
}
  const ro = new ResizeObserver(() => render());
  ro.observe(canvas);

(function ensureToolbar() {
    let tb = document.getElementById('canvas-toolbar');
    if (!tb) {
        tb = document.createElement('div');
        tb.id = 'canvas-toolbar';
        tb.className = 'canvas-toolbar';
        tb.innerHTML = `
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;justify-content:center;">
                <button type="button" data-act="zoom-in" title="Zoom In (+)">+</button>
                <button type="button" data-act="zoom-out" title="Zoom Out (-)">-</button>
                <button type="button" data-act="reset" title="Reset View (0)">Reset</button>
                <button type="button" data-act="export" title="Export Image (S)">Create Image</button>
                <button type="button" data-act="export-pdf" title="Export All Sheets as PDF (P)">Create PDF</button>
            </div>`;
        const host = previewsDiv?.parentElement || document.body;
        host.insertBefore(tb, previewsDiv || host.firstChild);
    }

    tb.addEventListener('click', (e) => {
        const act = e.target?.dataset?.act;
        if (!act) return;
        
        if (act === 'zoom-in') { 
            applyZoom(view.scale * 1.2, canvas.clientWidth/2, canvas.clientHeight/2); 
            drawMain(); 
            return; 
        }
        if (act === 'zoom-out') { 
            applyZoom(view.scale / 1.2, canvas.clientWidth/2, canvas.clientHeight/2); 
            drawMain(); 
            return; 
        }
        if (act === 'reset') { 
            resetZoom(); 
            drawMain(); 
            return; 
        }
        if (act === 'export') { 
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const mainCanvas = document.getElementById('canvas');
            
            tempCanvas.width = mainCanvas.width;
            tempCanvas.height = mainCanvas.height;
            tempCtx.drawImage(mainCanvas, 0, 0);
            
            const a = document.createElement('a'); 
            a.href = tempCanvas.toDataURL('image/png'); 
            a.download = `cutting-layout-sheet-${selectedSheetId || 1}.png`; 
            a.click(); 
            
            tempCanvas.remove();
            return; 
        }
        if (act === 'export-pdf') { 
            exportAllSheetsAsPDF(); 
            return; 
        }
    });
})();

  canvas.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    const factor = e.deltaY < 0 ? 1.2 : (1/1.2);
    applyZoom(view.scale * factor, p.x, p.y);
    drawMain();
  }, { passive: false });

  function isInputTarget(el) {
    const t = (el?.tagName || '').toLowerCase();
    return t === 'input' || t === 'select' || t === 'textarea' || el?.isContentEditable;
  }

 function nextSheet(delta) {
  if (!lastSolution || !lastSolution.sheets.length || !selectedSheetId) return;
  const i = lastSolution.sheets.findIndex(s => s.id === selectedSheetId);
  const n = (i + delta + lastSolution.sheets.length) % lastSolution.sheets.length;
  selectedSheetId = lastSolution.sheets[n].id;
  resetZoom(); drawMain(); highlightSelection();
  if (lastStats) injectResults(lastStats, selectedSheetId, lastAvailable);
}

function selectSheetByIndex(idx) {
  if (!lastSolution || !lastSolution.sheets.length) return;
  const clamped = Math.max(0, Math.min(idx, lastSolution.sheets.length - 1));
  selectedSheetId = lastSolution.sheets[clamped].id;
  resetZoom(); drawMain(); highlightSelection();
  if (lastStats) injectResults(lastStats, selectedSheetId, lastAvailable);
}

  window.addEventListener('keydown', (e) => {
    const k = e.key;

    if (k === 'Shift') {
        addAvailableRowAndFocus();
        e.preventDefault();
        return;
    }

    if (isInputTarget(e.target)) return;

    if (k === '=' || k === '+') { applyZoom(view.scale * 1.2, canvas.clientWidth/2, canvas.clientHeight/2); drawMain(); e.preventDefault(); return; }
    if (k === '-' || k === '_') { applyZoom(view.scale / 1.2, canvas.clientWidth/2, canvas.clientHeight/2); drawMain(); e.preventDefault(); return; }
    if (k === '0') { resetZoom(); drawMain(); e.preventDefault(); return; }
    if (k === 's' || k === 'S') { 
        const a = document.createElement('a'); 
        a.href = canvas.toDataURL('image/png'); 
        a.download = `cutting-layout-sheet-${selectedSheetId || 1}.png`; 
        a.click(); 
        e.preventDefault(); 
        return; 
    }
    if (k === 'p' || k === 'P') { 
        exportAllSheetsAsPDF(); 
        e.preventDefault(); 
        return; 
    }
    if (k === '[') { nextSheet(-1); e.preventDefault(); return; }
    if (k === ']') { nextSheet(+1); e.preventDefault(); return; }
    if (k === '1' || k === '2' || k === '3' || k === '4' || k === '5' || k === '6' || k === '7' || k === '8' || k === '9') { selectSheetByIndex(Number(k)-1); e.preventDefault(); return; }
});

  let _adjusting = false;
  function adjustCanvasToSheetAspect({ redraw = false } = {}) {
    if (_adjusting) return;
    _adjusting = true;

    const sel = lastSolution?.sheets?.find(s => s.id === selectedSheetId) || lastSolution?.sheets?.[0];
    const mobile = window.matchMedia('(max-width: 1024px)').matches;

    if (!sel) {
      canvas.style.height = mobile ? '56svh' : '60vh';
      ensureHiDPIFor(canvas);
      _adjusting = false;
      if (redraw) requestAnimationFrame(() => drawMain());
      return;
    }

    const ratio = sel.height / sel.width;
    const widthPx = Math.max(1, canvas.getBoundingClientRect().width);
    let targetH = Math.round(widthPx * ratio);

    const maxH = Math.round(window.innerHeight * (mobile ? 0.8 : 0.85));
    const minH = 220;
    targetH = Math.max(minH, Math.min(targetH, maxH));

    canvas.style.height = targetH + 'px';
    ensureHiDPIFor(canvas);

    _adjusting = false;
    if (redraw) requestAnimationFrame(() => drawMain());
  }

  const __drawMain = drawMain;
  drawMain = function() { adjustCanvasToSheetAspect({ redraw: false }); __drawMain(); };

  const __buildPreviews = buildPreviews;
  buildPreviews = function(sol) { __buildPreviews(sol); adjustCanvasToSheetAspect({ redraw: true }); };

  window.addEventListener('resize', () => adjustCanvasToSheetAspect({ redraw: true }));
  window.addEventListener('orientationchange', () => adjustCanvasToSheetAspect({ redraw: true }));

  render();
  adjustCanvasToSheetAspect({ redraw: true });
});

</script>
