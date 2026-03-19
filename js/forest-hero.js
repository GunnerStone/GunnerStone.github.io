(function () {
    'use strict';

    /* ================================================================
       §1  CONSTANTS & CONFIGURATION
       ================================================================ */

    var DPR = 1;                  // capped for performance
    var PAD = 80;                 // extra pixels each side for parallax
    var MAX_SHIFT = 35;           // max parallax pixel offset
    var NUM_PARTICLES = 60;
    var NUM_STARS = 90;

    // Normalised light direction (upper-left, toward viewer)
    var ld = { x: -0.4, y: -0.7, z: 0.5 };
    var ll = Math.sqrt(ld.x * ld.x + ld.y * ld.y + ld.z * ld.z);
    var LIGHT = { x: ld.x / ll, y: ld.y / ll, z: ld.z / ll };

    /* Layer definitions
       yBase : profile centre (fraction of canvas height)
       amp   : oscillation amplitude (fraction)
       px    : parallax multiplier (≤ 0.6)
       cell  : mesh cell size in pixels (60-80 range for large visible facets)
       trees : tree density per pixel of canvas width                        */
    var LAYERS = [
        { yBase: 0.28, amp: 0.09, px: 0.05, cell: 76, trees: 0.9 },
        { yBase: 0.38, amp: 0.10, px: 0.14, cell: 70, trees: 0.9 },
        { yBase: 0.50, amp: 0.11, px: 0.24, cell: 64, trees: 0.9 },
        { yBase: 0.64, amp: 0.09, px: 0.38, cell: 60, trees: 0.9 },
        { yBase: 0.78, amp: 0.05, px: 0.55, cell: 60, trees: 0.9 }
    ];

    var LAYER_SCALE = [0.35, 0.5, 0.7, 0.85, 1.0];

    /* ================================================================
       §2  THEME PALETTES
       ================================================================ */

    var THEMES = {
        dark: {
            sky: ['#050c18', '#0f172a'],
            layers: [
                { h: 220, s: 58, l: 9 },
                { h: 218, s: 55, l: 14 },
                { h: 215, s: 52, l: 20 },
                { h: 212, s: 50, l: 25 },
                { h: 210, s: 48, l: 30 }
            ],
            tree:  { h: 200, s: 40, l: 14 },
            trunk: { h: 25,  s: 20, l: 10 },
            bush:  { h: 160, s: 35, l: 12 },
            particle: [96, 165, 250],
            accent: { h: 217, s: 90, l: 60 }
        },
        light: {
            sky: ['#a8d8ea', '#e8f5e9'],
            layers: [
                { h: 140, s: 28, l: 78 },
                { h: 135, s: 32, l: 68 },
                { h: 130, s: 36, l: 56 },
                { h: 125, s: 38, l: 45 },
                { h: 120, s: 40, l: 36 }
            ],
            tree:  { h: 135, s: 45, l: 26 },
            trunk: { h: 30,  s: 35, l: 22 },
            bush:  { h: 125, s: 40, l: 22 },
            particle: [80, 140, 60],
            accent: { h: 145, s: 60, l: 38 }
        }
    };

    /* ================================================================
       §3  GLOBAL STATE
       ================================================================ */

    var W, H, canvas, ctx;
    var isDark = true;
    var terrainBitmaps = { dark: [], light: [] };
    var treeBitmaps = { dark: [], light: [] };
    var terrain = [];             // current theme terrain bitmaps
    var treeBmps = [];            // current theme tree bitmaps (mutable: fire erases from these)
    var vegItems = [];            // vegItems[li] = items from placeVegetation (for reset rebuild)
    var particles = [];
    var stars = [];
    var mx = 0, my = 0;          // target parallax (-1..1)
    var cx = 0, cy = 0;          // current (smoothed)
    var raf = 0;
    var resizeTimer = 0;
    var allTrees = [];            // allTrees[layerIdx] = [{...tree data, burned, burning, burnT}]
    var fireParticles = [];
    var mouseScreenX = -9999, mouseScreenY = -9999;
    var spatialGrids = [];
    var FIRE_BURN_TIME = 1.2;
    var FIRE_SPREAD_RADIUS = 60;
    var FIRE_GRID_CELL = 60;
    var lastFireTime = 0;
    var fireFrameCounter = 0;
    var hasActiveFire = false;
    var layerHasFire = [false, false, false, false, false];
    var fireStatsShown = false;
    var burnedCount = 0;
    var FIRE_QUIPS = [
        '9 out of 10 wildfires are human-caused.',
        'This took one click. Regrowing takes decades.',
        'A single acre of forest stores 100+ tonnes of CO₂.',
        'In 2023, U.S. wildfires burned 2.7 million acres.',
        'Every tree burned is a carbon sink lost forever.',
        'It takes 60 years for a pine forest to mature.',
        'Wildfires release more CO₂ than most countries emit.',
        'One careless moment. Decades of growth, gone.'
    ];
    var currentQuip = '';
    var lastQuipTime = 0;
    var cachedSkyCanvas = null;
    var cachedSkyTheme = '';
    var cachedVignetteCanvas = null;
    var cachedVignetteW = 0;
    var cachedVignetteH = 0;
    var cachedGlowCanvas = null;

    /* ================================================================
       §4  SEEDED PRNG — mulberry32
       Deterministic 32-bit PRNG for reproducible results.
       ================================================================ */

    function mulberry32(seed) {
        var s = seed | 0;
        return function () {
            s = (s + 0x6D2B79F5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* Fast sin approximation for visual effects (twinkle, flicker) */
    function fastSin(x) {
        x = x % 6.283185307;
        if (x > 3.141592653) x -= 6.283185307;
        else if (x < -3.141592653) x += 6.283185307;
        return 1.27323954 * x - 0.405284735 * x * (x < 0 ? -x : x);
    }

    /* ================================================================
       §5  TERRAIN PROFILE — deterministic sine-wave ridge heights
       Returns Y coordinate of terrain surface at horizontal position x
       for layer li, in offscreen-canvas coordinates (fw × fh).
       ================================================================ */

    function getProfile(x, fw, fh, li) {
        var c = LAYERS[li];
        var t = x / fw;
        var yb = c.yBase * fh;
        var a = c.amp * fh;
        return yb
            - a * 0.45 * Math.sin(t * Math.PI * 2.3 + li * 1.2 + 0.3)
            - a * 0.32 * Math.sin(t * Math.PI * 4.7 + li * 2.8 + 0.5)
            - a * 0.15 * Math.sin(t * Math.PI * 8.1 + li * 4.1 + 1.2)
            - a * 0.08 * Math.sin(t * Math.PI * 13.3 + li * 5.7 + 0.7);
    }

    /* ================================================================
       §6  PSEUDO-DEPTH FIELD — getZ
       Smooth pseudo-3D height field that gives each point a Z value.
       This drives the normal computation for the unified shade field.
       ================================================================ */

    function getZ(x, y, li) {
        return 30 * Math.sin(x * 0.011 + li) * Math.cos(y * 0.014 + li * 0.7)
             + 18 * Math.sin(x * 0.023 + li * 2.1) * Math.cos(y * 0.019 + li * 1.3);
    }

    /* ================================================================
       §7  UNIFIED SHADE FIELD — shadeAt(x, y, li)

       THE SINGLE SOURCE OF TRUTH for lighting. Computes a shade
       value in [0, 1] at any (x, y) on layer li by:
         1. Computing surface normal from getZ gradients (finite differences)
         2. Dotting with the global LIGHT vector
         3. Remapping to [0.35, 1.0] range

       Both terrain facets (at centroid) and vegetation (at base position)
       sample this SAME function. This guarantees consistent lighting:
       bright terrain → bright trees, dark terrain → dark trees.
       ================================================================ */

    function shadeAt(x, y, li) {
        var eps = 1.0;
        var dzdx = (getZ(x + eps, y, li) - getZ(x - eps, y, li)) / (2 * eps);
        var dzdy = (getZ(x, y + eps, li) - getZ(x, y - eps, li)) / (2 * eps);

        // Surface normal from gradient: n = (-dz/dx, -dz/dy, 1), then normalise
        var nx = -dzdx;
        var ny = -dzdy;
        var nz = 1.0;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nl < 0.001) return 0.65;
        nx /= nl; ny /= nl; nz /= nl;

        var diff = Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
        return 0.35 + 0.65 * diff;
    }

    /* ================================================================
       §8  DETERMINISTIC HASH — per-facet colour jitter
       Returns a stable value in [-0.5, 0.5) for a given triangle index.
       ================================================================ */

    function hashTriIndex(i0, i1, i2, salt) {
        var h = ((i0 * 73 + i1 * 137 + i2 * 251 + salt) * 2654435761) | 0;
        return ((h >>> 0) % 1000) / 1000 - 0.5;
    }

    /* ================================================================
       §9  MESH GENERATION — jittered grid conforming to terrain profile
       Builds a triangulated mesh from the ridgeline down to offscreen bottom.
       Alternating diagonal splits create organic-looking facets.
       ================================================================ */

    function buildMesh(li, fw, fh) {
        var cs = LAYERS[li].cell;
        var rng = mulberry32(42 + li * 137);

        var cols = Math.ceil(fw / cs);
        var rows = Math.max(6, Math.ceil(fh / cs));

        var pts = [];
        var gi = [];   // grid index [row][col] → pts index

        for (var r = 0; r <= rows; r++) {
            gi[r] = [];
            var rt = r / rows;
            for (var c = 0; c <= cols; c++) {
                var bx = c * fw / cols;
                var topY = getProfile(bx, fw, fh, li);
                var botY = fh + 200;

                var x = bx;
                var y = topY + (botY - topY) * rt;

                // Jitter interior points for organic facets
                if (r > 0 && r < rows) {
                    x += (rng() - 0.5) * cs * 0.55;
                    y += (rng() - 0.5) * cs * 0.35;
                }
                // Subtle horizontal jitter on profile row (keeps ridgeline shape)
                if (r === 0 && c > 0 && c < cols) {
                    x += (rng() - 0.5) * cs * 0.2;
                    y = getProfile(x, fw, fh, li);
                }

                gi[r][c] = pts.length;
                pts.push({ x: x, y: y });
            }
        }

        // Build triangles with alternating diagonals per quad
        var tris = [];
        for (var r2 = 0; r2 < rows; r2++) {
            for (var c2 = 0; c2 < cols; c2++) {
                var tl = gi[r2][c2],     tr = gi[r2][c2 + 1];
                var bl = gi[r2 + 1][c2], br = gi[r2 + 1][c2 + 1];
                if ((r2 + c2) % 2 === 0) {
                    tris.push([tl, tr, bl]);
                    tris.push([tr, br, bl]);
                } else {
                    tris.push([tl, tr, br]);
                    tris.push([tl, br, bl]);
                }
            }
        }

        return { pts: pts, tris: tris };
    }

    /* ================================================================
       §10  TERRAIN RENDERING
       Draws all mesh facets for a layer onto context g.
       Each facet is coloured by:
         - Base hue/sat from theme palette
         - Lightness driven by shadeAt() at the facet centroid
         - Per-facet hue jitter (±5°) and saturation jitter (±6%)
       Stroke = fill colour to seal sub-pixel gaps (anti-gap technique).
       ================================================================ */

    function renderTerrain(g, mesh, li, fw, fh) {
        var theme = isDark ? THEMES.dark : THEMES.light;
        var baseC = theme.layers[li];
        var accentC = theme.accent;
        var pts = mesh.pts, tris = mesh.tris;

        // Solid base fill below profile to prevent any transparency
        var baseFill = 'hsl(' + baseC.h + ',' + baseC.s + '%,' + (baseC.l * 0.4).toFixed(1) + '%)';
        g.fillStyle = baseFill;
        g.beginPath();
        g.moveTo(0, fh + 210);
        for (var px = 0; px <= fw; px += 4) {
            g.lineTo(px, getProfile(px, fw, fh, li) - 2);
        }
        g.lineTo(fw, fh + 210);
        g.closePath();
        g.fill();

        // Draw each facet
        for (var i = 0; i < tris.length; i++) {
            var a = pts[tris[i][0]];
            var b = pts[tris[i][1]];
            var c = pts[tris[i][2]];

            // Centroid for shade sampling
            var centX = (a.x + b.x + c.x) / 3;
            var centY = (a.y + b.y + c.y) / 3;

            // Unified shade at centroid
            var shade = shadeAt(centX, centY, li);

            // Per-facet deterministic jitter
            var hJitter = hashTriIndex(tris[i][0], tris[i][1], tris[i][2], 17) * 10;  // ±5°
            var sJitter = hashTriIndex(tris[i][0], tris[i][1], tris[i][2], 43) * 12;  // ±6%

            var h = baseC.h + hJitter;
            var s = Math.max(0, Math.min(100, baseC.s + sJitter));
            var l = Math.max(8, Math.min(95, baseC.l * shade));

            var color = 'hsl(' + h.toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%)';

            g.fillStyle = color;
            g.strokeStyle = color;   // anti-gap: stroke matches fill
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.lineTo(c.x, c.y);
            g.closePath();
            g.fill();
            g.stroke();
        }

        // Accent highlights on ~8% of peak-adjacent facets
        for (var j = 0; j < tris.length; j++) {
            var a2 = pts[tris[j][0]];
            var b2 = pts[tris[j][1]];
            var c2 = pts[tris[j][2]];
            var hash = ((tris[j][0] * 73 + tris[j][1] * 137 + tris[j][2] * 251) & 0xFF);
            if (hash < 20) {   // ~8% of 256
                var avgY = (a2.y + b2.y + c2.y) / 3;
                var profY = getProfile((a2.x + b2.x + c2.x) / 3, fw, fh, li);
                if (avgY < profY + fh * 0.06) {
                    g.fillStyle = 'hsla(' + accentC.h + ',' + accentC.s + '%,' + accentC.l + '%,0.13)';
                    g.beginPath();
                    g.moveTo(a2.x, a2.y);
                    g.lineTo(b2.x, b2.y);
                    g.lineTo(c2.x, c2.y);
                    g.closePath();
                    g.fill();
                }
            }
        }
    }

    /* ================================================================
       §11  VEGETATION PLACEMENT — scatter trees with seeded PRNG
       Places trees/bushes between ridgeline and next-layer coverage.
       Each vegetation item stores its shadeAt() value for rendering.
       ================================================================ */

    function placeVegetation(li, fw, fh) {
        var rng = mulberry32(999 + li * 77);
        var scale = LAYER_SCALE[li];
        var count = Math.floor(fw * LAYERS[li].trees / scale);
        var isFront = (li >= LAYERS.length - 1);

        var items = [];
        for (var i = 0; i < count; i++) {
            var x = rng() * fw;
            var profileY = getProfile(x, fw, fh, li);
            var slopeDepth;
            if (!isFront) {
                var nextProfileY = getProfile(x, fw, fh, li + 1);
                slopeDepth = Math.max(nextProfileY - profileY + fh * 0.10, fh * 0.08);
            } else {
                slopeDepth = fh - profileY;
            }
            var by = profileY + rng() * slopeDepth;
            var type = rng();
            var individualScale = scale * (0.7 + rng() * 0.6);
            var seed = rng();

            // Unified shade at tree base — same lighting as terrain
            var ts = shadeAt(x, by, li);

            items.push({ x: x, y: by, type: type, scale: individualScale, seed: seed, shade: ts, li: li });
        }

        // Y-sort: trees lower on screen drawn on top
        items.sort(function (a, b) { return a.y - b.y; });
        return items;
    }

    /* ================================================================
       §12  VEGETATION RENDERING — 5 tree/bush types
       All types use the split-triangle technique:
         left half = lit colour,  right half = shadow colour
       Overall brightness modulated by shadeAt() from placement:
         litL  = baseLightness × shade × 1.15
         shadL = baseLightness × shade × 0.75
       Tier gradient for multi-tier trees: brightness = 0.7 + 0.3 × t
       ================================================================ */

    // --- Tall Pine ---
    function drawTallPine(g, x, by, rng, tc, trc, scale, shade) {
        var th = (30 + rng() * 28) * scale;
        var tw = th * 0.22;
        var nl = 3 + Math.floor(rng() * 2);
        var trW = tw * 0.18, trH = th * 0.2;

        // Trunk
        var trkL = Math.max(4, trc.l * shade);
        g.fillStyle = 'hsl(' + trc.h + ',' + trc.s + '%,' + trkL.toFixed(1) + '%)';
        g.fillRect(x - trW / 2, by - trH, trW, trH);

        // Foliage tiers
        for (var j = 0; j < nl; j++) {
            var t = j / nl;
            var w = tw * (1 - t * 0.25);
            var h = th * 0.35;
            var yy = by - trH * 0.3 - t * th * 0.55;
            var tierBright = 0.7 + 0.3 * t;
            var litL  = Math.max(4, Math.min(95, tc.l * tierBright * shade * 1.15));
            var shadL = Math.max(4, Math.min(95, tc.l * tierBright * shade * 0.75));
            rng(); rng(); rng();

            // Left lit half
            g.fillStyle = 'hsl(' + tc.h + ',' + tc.s + '%,' + litL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x, yy - h); g.lineTo(x - w / 2, yy); g.lineTo(x, yy);
            g.closePath(); g.fill();

            // Right shadow half
            g.fillStyle = 'hsl(' + tc.h + ',' + tc.s + '%,' + shadL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x, yy - h); g.lineTo(x, yy); g.lineTo(x + w / 2, yy);
            g.closePath(); g.fill();
        }
    }

    // --- Wide Pine ---
    function drawWidePine(g, x, by, rng, tc, trc, scale, shade) {
        var th = (18 + rng() * 16) * scale;
        var tw = th * 0.65;
        var nl = 2 + Math.floor(rng() * 2);
        var trW = tw * 0.12, trH = th * 0.22;

        var trkL = Math.max(4, trc.l * shade);
        g.fillStyle = 'hsl(' + trc.h + ',' + trc.s + '%,' + trkL.toFixed(1) + '%)';
        g.fillRect(x - trW / 2, by - trH, trW, trH);

        for (var j = 0; j < nl; j++) {
            var t = j / nl;
            var w = tw * (1 - t * 0.3);
            var h = th * 0.5;
            var yy = by - trH * 0.3 - t * th * 0.45;
            var tierBright = 0.7 + 0.3 * t;
            var litL  = Math.max(4, Math.min(95, (tc.l + 2) * tierBright * shade * 1.15));
            var shadL = Math.max(4, Math.min(95, (tc.l + 2) * tierBright * shade * 0.75));
            rng(); rng(); rng();

            g.fillStyle = 'hsl(' + (tc.h + 5) + ',' + tc.s + '%,' + litL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x, yy - h); g.lineTo(x - w / 2, yy); g.lineTo(x, yy);
            g.closePath(); g.fill();

            g.fillStyle = 'hsl(' + (tc.h + 5) + ',' + tc.s + '%,' + shadL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x, yy - h); g.lineTo(x, yy); g.lineTo(x + w / 2, yy);
            g.closePath(); g.fill();
        }
    }

    // --- Classic Tree ---
    function drawClassicTree(g, x, by, rng, tc, trc, scale, shade) {
        var th = (14 + rng() * 32) * scale;
        var tw = th * 0.34;
        var nl = 2 + Math.floor(rng() * 2);
        var trW = tw * 0.14, trH = th * 0.25;

        var trkL = Math.max(4, trc.l * shade);
        g.fillStyle = 'hsl(' + trc.h + ',' + trc.s + '%,' + trkL.toFixed(1) + '%)';
        g.fillRect(x - trW / 2, by - trH, trW, trH);

        for (var j = 0; j < nl; j++) {
            var t = j / nl;
            var w = tw * (1 - t * 0.35);
            var h = th * 0.42;
            var yy = by - trH * 0.35 - t * th * 0.52;
            var tierBright = 0.7 + 0.3 * t;
            var litL  = Math.max(4, Math.min(95, tc.l * tierBright * shade * 1.15));
            var shadL = Math.max(4, Math.min(95, tc.l * tierBright * shade * 0.75));
            rng(); rng(); rng();

            g.fillStyle = 'hsl(' + tc.h + ',' + tc.s + '%,' + litL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x, yy - h); g.lineTo(x - w / 2, yy); g.lineTo(x, yy);
            g.closePath(); g.fill();

            g.fillStyle = 'hsl(' + tc.h + ',' + tc.s + '%,' + shadL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x, yy - h); g.lineTo(x, yy); g.lineTo(x + w / 2, yy);
            g.closePath(); g.fill();
        }
    }

    // --- Bush ---
    function drawBush(g, x, by, rng, bc, scale, shade) {
        var bw = (8 + rng() * 12) * scale;
        var bh = bw * (0.5 + rng() * 0.3);
        var nf = 2 + Math.floor(rng() * 2);

        for (var f = 0; f < nf; f++) {
            var ox = (f === 0) ? 0 : (rng() - 0.5) * bw * 0.5;
            var fw2 = bw * (0.35 + rng() * 0.35);
            var fh2 = bh * (0.5 + rng() * 0.5);
            rng();
            var litL  = Math.max(4, Math.min(95, bc.l * shade * 1.15));
            var shadL = Math.max(4, Math.min(95, bc.l * shade * 0.72));
            var topOff = (rng() - 0.5) * fw2 * 0.2;

            // Left lit half
            g.fillStyle = 'hsl(' + bc.h + ',' + (bc.s + 5) + '%,' + litL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x + ox - fw2 * 0.5, by);
            g.lineTo(x + ox - fw2 * 0.38, by - fh2 * 0.65);
            g.lineTo(x + ox + topOff, by - fh2);
            g.lineTo(x + ox, by);
            g.closePath(); g.fill();

            // Right shadow half
            g.fillStyle = 'hsl(' + bc.h + ',' + (bc.s + 5) + '%,' + shadL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x + ox + topOff, by - fh2);
            g.lineTo(x + ox + fw2 * 0.38, by - fh2 * 0.6);
            g.lineTo(x + ox + fw2 * 0.5, by);
            g.lineTo(x + ox, by);
            g.closePath(); g.fill();
        }
    }

    // --- Undergrowth ---
    function drawUndergrowth(g, x, by, rng, bc, scale, shade) {
        var count = 2 + Math.floor(rng() * 4);
        for (var k = 0; k < count; k++) {
            var ox = (rng() - 0.5) * 16 * scale;
            var uh = (3 + rng() * 5) * scale;
            var uw = (3 + rng() * 5) * scale;
            rng();
            var litL  = Math.max(4, Math.min(95, bc.l * shade * 1.1));
            var shadL = Math.max(4, Math.min(95, bc.l * shade * 0.7));
            var skew = (rng() - 0.5) * uw * 0.3;

            // Left lit half
            g.fillStyle = 'hsl(' + (bc.h + 8) + ',' + (bc.s + 8) + '%,' + litL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x + ox + skew, by - uh);
            g.lineTo(x + ox - uw / 2, by);
            g.lineTo(x + ox, by);
            g.closePath(); g.fill();

            // Right shadow half
            g.fillStyle = 'hsl(' + (bc.h + 8) + ',' + (bc.s + 8) + '%,' + shadL.toFixed(1) + '%)';
            g.beginPath();
            g.moveTo(x + ox + skew, by - uh);
            g.lineTo(x + ox, by);
            g.lineTo(x + ox + uw / 2, by);
            g.closePath(); g.fill();
        }
    }

    /* Dispatch: draw a single vegetation item */
    function drawVegetationItem(g, item, theme) {
        // Scale tree colors by layer depth — back layers are darker, matching terrain
        var layerL = theme.layers[item.li].l;
        var frontL = theme.layers[LAYERS.length - 1].l;
        var depthRatio = layerL / frontL;
        var tc = { h: theme.tree.h, s: theme.tree.s, l: theme.tree.l * depthRatio };
        var trc = { h: theme.trunk.h, s: theme.trunk.s, l: theme.trunk.l * depthRatio };
        var bc = { h: theme.bush.h, s: theme.bush.s, l: theme.bush.l * depthRatio };
        var treeRng = mulberry32(Math.floor(item.seed * 99999));
        var shade = item.shade;

        if (item.type < 0.30) {
            drawTallPine(g, item.x, item.y, treeRng, tc, trc, item.scale, shade);
        } else if (item.type < 0.52) {
            drawWidePine(g, item.x, item.y, treeRng, tc, trc, item.scale, shade);
        } else if (item.type < 0.72) {
            drawClassicTree(g, item.x, item.y, treeRng, tc, trc, item.scale, shade);
        } else if (item.type < 0.88) {
            drawBush(g, item.x, item.y, treeRng, bc, item.scale, shade);
        } else {
            drawUndergrowth(g, item.x, item.y, treeRng, bc, item.scale, shade);
        }
    }

    /* ================================================================
       §13  RENDER VEGETATION — draw Y-sorted vegetation items
       ================================================================ */

    function renderVegetation(g, items, theme) {
        for (var i = 0; i < items.length; i++) {
            drawVegetationItem(g, items[i], theme);
        }
    }

    /* ================================================================
       §13b  FIRE SYSTEM — spatial grid, spread mechanics, overlays
       ================================================================ */

    function buildSpatialGrid(items, cellSize) {
        var grid = {};
        for (var i = 0; i < items.length; i++) {
            var gx = Math.floor(items[i].x / cellSize);
            var gy = Math.floor(items[i].y / cellSize);
            var key = gx + '_' + gy;
            if (!grid[key]) grid[key] = [];
            grid[key].push(i);
        }
        return grid;
    }

    function queryNearby(grid, items, x, y, radius, cellSize) {
        var results = [];
        var r2 = radius * radius;
        var cr = Math.ceil(radius / cellSize);
        var gx = Math.floor(x / cellSize);
        var gy = Math.floor(y / cellSize);
        for (var dx = -cr; dx <= cr; dx++) {
            for (var dy = -cr; dy <= cr; dy++) {
                var cell = grid[(gx + dx) + '_' + (gy + dy)];
                if (cell) {
                    for (var ci = 0; ci < cell.length; ci++) {
                        var item = items[cell[ci]];
                        var ddx = item.x - x, ddy = item.y - y;
                        var d2 = ddx * ddx + ddy * ddy;
                        if (d2 <= r2) results.push({ idx: cell[ci], dist: Math.sqrt(d2) });
                    }
                }
            }
        }
        return results;
    }

    function estimateTreeHeight(item) {
        var rng = mulberry32(Math.floor(item.seed * 99999));
        if (item.type < 0.30) return (30 + rng() * 28) * item.scale;
        if (item.type < 0.52) return (18 + rng() * 16) * item.scale;
        if (item.type < 0.72) return (14 + rng() * 32) * item.scale;
        if (item.type < 0.88) {
            var bw = (8 + rng() * 12) * item.scale;
            return bw * (0.5 + rng() * 0.3);
        }
        return (3 + rng() * 5) * item.scale;
    }

    function eraseTreeFromBitmap(bmpCanvas, tree) {
        var g = bmpCanvas.getContext('2d');
        var th = estimateTreeHeight(tree);
        var tw = th * 0.7;
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = 'rgba(0,0,0,1)';
        g.fillRect(tree.x - tw, tree.y - th * 1.2, tw * 2, th * 1.4);
        g.restore();
    }

    function igniteTree(layerIdx, treeIdx) {
        var tree = allTrees[layerIdx][treeIdx];
        if (!tree.burning && !tree.burned) {
            tree.burning = true;
            tree.burnT = 0;
            hasActiveFire = true;
            layerHasFire[layerIdx] = true;
            if (!fireStatsShown) {
                fireStatsShown = true;
                currentQuip = FIRE_QUIPS[Math.floor(Math.random() * FIRE_QUIPS.length)];
                document.getElementById('fire-quip').textContent = currentQuip;
                document.getElementById('fire-stats').classList.add('visible');
            }
        }
    }

    function updateFireStats() {
        // Typical mature Pinus ponderosa (~70cm DBH): ~1.5 tonnes C = ~5.5 tonnes CO₂
        // Source: USDA Forest Service GTR NRS-202
        var co2 = (burnedCount * 5.5).toFixed(1);
        // Average ponderosa pine takes ~60-80 years to reach maturity
        var years = burnedCount * 70;
        document.getElementById('stat-trees').textContent = burnedCount.toLocaleString();
        document.getElementById('stat-co2').textContent = Number(co2).toLocaleString();
        document.getElementById('stat-years').textContent = years.toLocaleString();
        document.getElementById('fire-source').textContent =
            'Est. based on mature Pinus ponderosa (~70cm DBH, ~1.5t C/tree). USDA FS GTR NRS-202';
        // Rotate quip every 15 seconds
        var now = performance.now() * 0.001;
        if (now - lastQuipTime > 15) {
            lastQuipTime = now;
            currentQuip = FIRE_QUIPS[Math.floor(Math.random() * FIRE_QUIPS.length)];
            document.getElementById('fire-quip').textContent = currentQuip;
        }
    }

    function updateFire(dt) {
        if (dt <= 0 || dt > 0.2) dt = 0.016;
        fireFrameCounter++;
        var doSpread = (fireFrameCounter % 10 === 0);

        for (var li = 0; li < allTrees.length; li++) {
            var layerTrees = allTrees[li];
            if (!layerTrees) continue;
            for (var ti = 0; ti < layerTrees.length; ti++) {
                var tree = layerTrees[ti];
                if (!tree.burning) continue;

                tree.burnT += dt / FIRE_BURN_TIME;

                // Spawn fire particles (heavily capped)
                if (fireParticles.length < 25 && Math.random() < 0.03) {
                    var th = estimateTreeHeight(tree);
                    fireParticles.push({
                        x: tree.x + (Math.random() - 0.5) * 10 * tree.scale,
                        y: tree.y - th * 0.4 - Math.random() * th * 0.3,
                        vx: (Math.random() - 0.5) * 0.8,
                        vy: -Math.random() * 1.5 - 0.5,
                        life: 0,
                        maxLife: 0.5 + Math.random() * 0.8,
                        sz: 1.5 + Math.random() * 2.5,
                        li: li
                    });
                }

                if (tree.burnT >= 1) {
                    tree.burning = false;
                    tree.burned = true;
                    burnedCount++;
                    updateFireStats();
                    // Erase from tree bitmaps (both themes)
                    if (treeBitmaps.dark[li]) eraseTreeFromBitmap(treeBitmaps.dark[li], tree);
                    if (treeBitmaps.light[li]) eraseTreeFromBitmap(treeBitmaps.light[li], tree);
                    continue;
                }

                // Only run spread logic every 3rd frame
                if (!doSpread) continue;

                // Spread to neighbors on same layer
                if (spatialGrids[li]) {
                    var neighbors = queryNearby(spatialGrids[li], layerTrees, tree.x, tree.y, FIRE_SPREAD_RADIUS, FIRE_GRID_CELL);
                    for (var ni = 0; ni < neighbors.length; ni++) {
                        var n = neighbors[ni];
                        var neighbor = layerTrees[n.idx];
                        if (neighbor.burning || neighbor.burned) continue;
                        var prob = (1 - n.dist / FIRE_SPREAD_RADIUS) * 0.006;
                        if (Math.random() < prob) {
                            neighbor.burning = true;
                            neighbor.burnT = 0;
                        }
                    }
                }

                // Cross-layer spread disabled — layers are at different depths
            }
        }

        // Update fire particles (swap-and-pop removal)
        for (var pi = fireParticles.length - 1; pi >= 0; pi--) {
            var p = fireParticles[pi];
            p.life += dt;
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= dt * 0.3;
            if (p.life >= p.maxLife) {
                fireParticles[pi] = fireParticles[fireParticles.length - 1];
                fireParticles.pop();
            }
        }

        // Recompute fire activity flags
        var anyFire = fireParticles.length > 0;
        for (var fli = 0; fli < allTrees.length; fli++) {
            layerHasFire[fli] = false;
            if (!allTrees[fli]) continue;
            for (var fti = 0; fti < allTrees[fli].length; fti++) {
                if (allTrees[fli][fti].burning || allTrees[fli][fti].burned) {
                    layerHasFire[fli] = true;
                    anyFire = true;
                }
            }
        }
        hasActiveFire = anyFire;
    }

    function drawFireOverlays(g, layerTrees, ox, oy, now, layerIndex) {
        for (var ti = 0; ti < layerTrees.length; ti++) {
            var tree = layerTrees[ti];
            if (!tree.burning && !tree.burned) continue;
            var sx = tree.x - PAD + ox;
            var sy = tree.y + oy;

            // Cull off-screen trees early
            if (sx < -80 || sx > W + 80 || sy < -120 || sy > H + 60) continue;

            var th = estimateTreeHeight(tree);

            if (tree.burning) {
                var alpha = 0.4 * (1 - tree.burnT * 0.5);
                var glowR = th * 0.5;

                g.globalAlpha = alpha;
                g.fillStyle = '#ff6a10';
                g.fillRect(sx - glowR, sy - th * 0.7, glowR * 2, th * 0.8);
                g.globalAlpha = 1;

            } else if (tree.burned) {
                // Small stump only — cheap
                var stumpW = 3 * tree.scale;
                var stumpH = 4 * tree.scale;
                g.fillStyle = '#1e1610';
                g.fillRect(sx - stumpW / 2, sy - stumpH, stumpW, stumpH);
            }
        }
    }

    function drawFireParticles(g, now) {
        if (fireParticles.length === 0) return;
        g.globalAlpha = 0.6;
        g.fillStyle = '#ffa030';
        for (var pi = 0; pi < fireParticles.length; pi++) {
            var p = fireParticles[pi];
            var pox = cx * MAX_SHIFT * LAYERS[p.li].px;
            var poy = cy * MAX_SHIFT * LAYERS[p.li].px * 0.3;
            var sx = p.x - PAD + pox;
            var sy = p.y + poy;
            var sz = p.sz * (1 - (p.life / p.maxLife) * 0.5);
            g.fillRect(sx - sz, sy - sz, sz * 2, sz * 2);
        }
        g.globalAlpha = 1;
    }

    function drawMouseGlow(g) {
        if (mouseScreenX < -100 || mouseScreenY < -100) return;
        if (!cachedGlowCanvas) buildGlowCache();
        g.drawImage(cachedGlowCanvas, mouseScreenX - 100, mouseScreenY - 100);
    }

    function resetFire() {
        for (var li = 0; li < allTrees.length; li++) {
            if (!allTrees[li]) continue;
            for (var ti = 0; ti < allTrees[li].length; ti++) {
                allTrees[li][ti].burning = false;
                allTrees[li][ti].burned = false;
                allTrees[li][ti].burnT = 0;
            }
        }
        fireParticles = [];
        hasActiveFire = false;
        layerHasFire = [false, false, false, false, false];
        burnedCount = 0;
        fireStatsShown = false;
        document.getElementById('fire-stats').classList.remove('visible');
        // Rebuild tree bitmaps from scratch (re-render vegetation)
        var fw = W + PAD * 2, fh = H + 60;
        var savedDark = isDark;
        isDark = true;
        for (var i = 0; i < LAYERS.length; i++) {
            treeBitmaps.dark[i] = renderTreeLayer(i, fw, fh);
        }
        isDark = false;
        for (var i = 0; i < LAYERS.length; i++) {
            treeBitmaps.light[i] = renderTreeLayer(i, fw, fh);
        }
        isDark = savedDark;
        terrain = isDark ? terrainBitmaps.dark : terrainBitmaps.light;
        treeBmps = isDark ? treeBitmaps.dark : treeBitmaps.light;
    }

    function handleFireClick(clickX, clickY) {
        var bestDist = 40;
        var bestLayer = -1, bestIdx = -1;

        for (var li = 0; li < allTrees.length; li++) {
            if (!allTrees[li] || !spatialGrids[li]) continue;
            var ox = cx * MAX_SHIFT * LAYERS[li].px;
            var oy = cy * MAX_SHIFT * LAYERS[li].px * 0.3;
            var layerX = clickX + PAD - ox;
            var layerY = clickY - oy;

            var nearby = queryNearby(spatialGrids[li], allTrees[li], layerX, layerY, 40, FIRE_GRID_CELL);
            for (var ni = 0; ni < nearby.length; ni++) {
                if (nearby[ni].dist < bestDist) {
                    bestDist = nearby[ni].dist;
                    bestLayer = li;
                    bestIdx = nearby[ni].idx;
                }
            }
        }

        if (bestLayer >= 0) {
            igniteTree(bestLayer, bestIdx);
        }
    }

    /* ================================================================
       §14  LAYER PIPELINE — assemble terrain and tree layer bitmaps
       For each of 5 layers:
         1. generateProfile (via getProfile)
         2. buildMesh
         3. renderTerrain → terrain bitmap
         4. placeVegetation + renderVegetation → tree bitmap (transparent bg)
       ================================================================ */

    function renderTerrainLayer(li, fw, fh) {
        var oc = document.createElement('canvas');
        oc.width = fw;
        oc.height = fh + 200;
        var g = oc.getContext('2d');
        var mesh = buildMesh(li, fw, fh);
        renderTerrain(g, mesh, li, fw, fh);
        return oc;
    }

    function renderTreeLayer(li, fw, fh) {
        var theme = isDark ? THEMES.dark : THEMES.light;
        var oc = document.createElement('canvas');
        oc.width = fw;
        oc.height = fh + 200;
        var g = oc.getContext('2d');
        // Transparent background — no fill

        if (LAYERS[li].trees > 0) {
            var items = placeVegetation(li, fw, fh);
            renderVegetation(g, items, theme);
            // Store vegetation items for reset rebuild (first call per layer)
            if (!vegItems[li]) {
                vegItems[li] = items;
            }
            // Store tree data globally for fire system (first pass only)
            if (!allTrees[li]) {
                allTrees[li] = [];
                for (var k = 0; k < items.length; k++) {
                    allTrees[li].push({
                        x: items[k].x, y: items[k].y,
                        type: items[k].type, scale: items[k].scale,
                        seed: items[k].seed, shade: items[k].shade,
                        li: items[k].li,
                        burned: false, burning: false, burnT: 0
                    });
                }
                spatialGrids[li] = buildSpatialGrid(allTrees[li], FIRE_GRID_CELL);
            }
        }

        return oc;
    }

    /* ================================================================
       §15  PARTICLES & STARS
       Floating particles: fireflies (dark) / dust motes (light).
       Stars with twinkle animation in dark mode only.
       ================================================================ */

    function initParticles() {
        particles = [];
        for (var i = 0; i < NUM_PARTICLES; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.4 - 0.1,
                sz: Math.random() * 2 + 0.5,
                al: Math.random() * 0.3 + 0.08
            });
        }
    }

    function initStars() {
        stars = [];
        var rng = mulberry32(314159);
        for (var i = 0; i < NUM_STARS; i++) {
            stars.push({
                x: rng() * W,
                y: rng() * H * 0.45,
                sz: rng() * 1.5 + 0.3,
                al: rng() * 0.5 + 0.15,
                spd: rng() * 1.5 + 0.8
            });
        }
    }

    /* Cache builders for per-frame expensive operations */
    function buildSkyCache() {
        var theme = isDark ? THEMES.dark : THEMES.light;
        cachedSkyCanvas = document.createElement('canvas');
        cachedSkyCanvas.width = 1;
        cachedSkyCanvas.height = H;
        var g = cachedSkyCanvas.getContext('2d');
        var grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, theme.sky[0]);
        grad.addColorStop(1, theme.sky[1]);
        g.fillStyle = grad;
        g.fillRect(0, 0, 1, H);
        cachedSkyTheme = isDark ? 'dark' : 'light';
    }

    function buildVignetteCache() {
        cachedVignetteCanvas = document.createElement('canvas');
        cachedVignetteCanvas.width = W;
        cachedVignetteCanvas.height = H;
        var g = cachedVignetteCanvas.getContext('2d');
        var vig = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.25)');
        g.fillStyle = vig;
        g.fillRect(0, 0, W, H);
        cachedVignetteW = W;
        cachedVignetteH = H;
    }

    function buildGlowCache() {
        cachedGlowCanvas = document.createElement('canvas');
        cachedGlowCanvas.width = 200;
        cachedGlowCanvas.height = 200;
        var g = cachedGlowCanvas.getContext('2d');
        var grad = g.createRadialGradient(100, 100, 0, 100, 100, 100);
        grad.addColorStop(0, 'rgba(255,180,50,0.15)');
        grad.addColorStop(0.5, 'rgba(255,140,30,0.06)');
        grad.addColorStop(1, 'rgba(255,100,10,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 200, 200);
    }

    /* ================================================================
       §16  SCENE BUILD — pre-render all layer bitmaps
       ================================================================ */

    function buildScene() {
        var fw = W + PAD * 2;
        var fh = H + 60;
        allTrees = [];
        spatialGrids = [];
        fireParticles = [];
        lastFireTime = 0;
        vegItems = [];
        // Pre-render BOTH themes so toggling is instant
        isDark = true;
        terrainBitmaps.dark = [];
        treeBitmaps.dark = [];
        for (var i = 0; i < LAYERS.length; i++) {
            terrainBitmaps.dark.push(renderTerrainLayer(i, fw, fh));
            treeBitmaps.dark.push(renderTreeLayer(i, fw, fh));
        }
        isDark = false;
        terrainBitmaps.light = [];
        treeBitmaps.light = [];
        for (var i = 0; i < LAYERS.length; i++) {
            terrainBitmaps.light.push(renderTerrainLayer(i, fw, fh));
            treeBitmaps.light.push(renderTreeLayer(i, fw, fh));
        }
        // Detect actual theme from main site
        isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        terrain = isDark ? terrainBitmaps.dark : terrainBitmaps.light;
        treeBmps = isDark ? treeBitmaps.dark : treeBitmaps.light;
        initParticles();
        initStars();
        buildSkyCache();
        buildVignetteCache();
        buildGlowCache();
    }

    /* ================================================================
       §17  RENDER LOOP— composites pre-rendered layers + particles
       Only drawImage calls + lightweight particle updates per frame.
       Target: 60fps via minimal per-frame work.
       ================================================================ */

    function render() {
        // Smooth parallax interpolation (lerp toward target)
        cx += (mx - cx) * 0.06;
        cy += (my - cy) * 0.06;

        var theme = isDark ? THEMES.dark : THEMES.light;
        var now = performance.now() * 0.001;

        // Fire system update (skip when no fire active)
        if (hasActiveFire) {
            if (lastFireTime > 0) updateFire(now - lastFireTime);
        }
        lastFireTime = now;

        // --- Sky gradient (cached to 1px-wide offscreen canvas) ---
        if (!cachedSkyCanvas || cachedSkyTheme !== (isDark ? 'dark' : 'light')) buildSkyCache();
        ctx.drawImage(cachedSkyCanvas, 0, 0, 1, H, 0, 0, W, H);

        // --- Stars (dark mode only, fast sin twinkle, fillStyle set once) ---
        if (isDark) {
            ctx.fillStyle = '#fff';
            for (var si = 0; si < stars.length; si++) {
                var s = stars[si];
                var twinkle = 0.55 + 0.45 * fastSin(now * s.spd + s.x * 0.05 + s.y * 0.07);
                ctx.globalAlpha = s.al * twinkle;
                ctx.fillRect(s.x, s.y, s.sz, s.sz);
            }
            ctx.globalAlpha = 1;
        }

        // --- Parallax layer compositing + fire overlays ---
        for (var i = 0; i < LAYERS.length; i++) {
            var ox = cx * MAX_SHIFT * LAYERS[i].px;
            var oy = cy * MAX_SHIFT * LAYERS[i].px * 0.3;
            ctx.drawImage(terrain[i], -PAD + ox, oy);
            ctx.drawImage(treeBmps[i], -PAD + ox, oy);
            if (layerHasFire[i]) drawFireOverlays(ctx, allTrees[i], ox, oy, now, i);
        }

        // Mouse glow cursor
        drawMouseGlow(ctx);

        // --- Subtle vignette (dark mode, cached to offscreen canvas) ---
        if (isDark) {
            if (!cachedVignetteCanvas || cachedVignetteW !== W || cachedVignetteH !== H) buildVignetteCache();
            ctx.drawImage(cachedVignetteCanvas, 0, 0);
        }

        // --- Fire particles (skip when no fire) ---
        if (hasActiveFire) drawFireParticles(ctx, now);

        // --- Floating particles (pre-built color, fillRect) ---
        var pc = theme.particle;
        ctx.fillStyle = 'rgb(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ')';
        var pxOff = cx * MAX_SHIFT * 0.3;
        var pyOff = cy * MAX_SHIFT * 0.15;
        for (var pi = 0; pi < particles.length; pi++) {
            var p = particles[pi];
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10)  { p.y = H + 10; p.x = Math.random() * W; }
            if (p.x < -10)  p.x = W + 10;
            if (p.x > W + 10) p.x = -10;

            ctx.globalAlpha = p.al;
            ctx.fillRect(p.x + pxOff - p.sz, p.y + pyOff - p.sz, p.sz * 2, p.sz * 2);
        }
        ctx.globalAlpha = 1;

        raf = requestAnimationFrame(render);
    }

    /* ================================================================
       §18  INIT / RESIZE / THEME TOGGLE
       ================================================================ */

    function resize() {
        var heroEl = document.getElementById('hero');
        W = heroEl.clientWidth;
        H = heroEl.clientHeight;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        if (DPR !== 1) ctx.scale(DPR, DPR);
    }


    function init() {
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');

        resize();
        buildScene();

        /* Fade out fog overlay — rAF ensures browser paints opacity:1 first */
        var fog = document.getElementById('fog');
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                fog.classList.add('hidden');
                fog.addEventListener('transitionend', function () { fog.remove(); });
                setTimeout(function () { if (fog.parentNode) fog.remove(); }, 2500);
            });
        });

        var heroEl = document.getElementById('hero');

        // Mouse-driven parallax (hero-relative)
        heroEl.addEventListener('mousemove', function (e) {
            var rect = heroEl.getBoundingClientRect();
            mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        });
        heroEl.addEventListener('mouseleave', function () { mx = 0; my = 0; });

        // Touch parallax (hero-relative)
        heroEl.addEventListener('touchmove', function (e) {
            if (e.touches.length) {
                var rect = heroEl.getBoundingClientRect();
                mx = ((e.touches[0].clientX - rect.left) / rect.width - 0.5) * 2;
                my = ((e.touches[0].clientY - rect.top) / rect.height - 0.5) * 2;
            }
        }, { passive: true });
        heroEl.addEventListener('touchend', function () { mx = 0; my = 0; });

        // Debounced resize → full rebuild
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                cancelAnimationFrame(raf);
                resize();
                buildScene();
                render();
            }, 200);
        });


        // Listen for main site theme toggle
        document.addEventListener('theme-changed', function (e) {
            isDark = e.detail.theme === 'dark';
            terrain = isDark ? terrainBitmaps.dark : terrainBitmaps.light;
            treeBmps = isDark ? treeBitmaps.dark : treeBitmaps.light;
            initParticles();
            initStars();
            buildSkyCache();
        });

        // Fire system: click to ignite (hero-relative coordinates)
        canvas.addEventListener('click', function (e) {
            var rect = canvas.getBoundingClientRect();
            handleFireClick(e.clientX - rect.left, e.clientY - rect.top);
        });

        canvas.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            mouseScreenX = e.clientX - rect.left;
            mouseScreenY = e.clientY - rect.top;
        });
        canvas.addEventListener('mouseleave', function () {
            mouseScreenX = -9999;
            mouseScreenY = -9999;
        });

        render();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();