(function(){
"use strict";

/* ── Configuration ───────────────────────────────── */
var PX   = 5;          // pixel grid size
var DPR  = 1;          // capped for performance

/* ── Color Palettes (dark / light) ───────────────── */
var PALETTES = {
  dark: {
    skyTop:    "#070d1a",
    skyBot:    "#0f172a",
    stars:     "#60a5fa",
    mountain:  "#0d1526",
    mountain2: "#111d35",
    treeDark:  "#0a1628",
    treeMid:   "#0f1f3a",
    treeLit:   "#162a4d",
    treeHigh:  "#1e3a5f",
    trunk:     "#1a1a2e",
    farGnd:    "#0b1320",
    farGndTex: "#0e1830",
    farGndTop: "#132040",
    midGnd:    "#0d1628",
    midGndTex: "#121e38",
    midGndTop: "#182a48",
    nearGnd:   "#101c30",
    nearGndTex:"#162640",
    nearGndTop:"#1e3250",
    ground1:   "#0c1322",
    ground2:   "#0f172a",
    grass1:    "#1a3a4a",
    grass2:    "#1e4d5a",
    grass3:    "#22605a",
    rock:      "#2a2a4a",
    rockHi:    "#3a3a5e",
    mushCap:   "#60a5fa",
    mushStem:  "#c8d6e5",
    particle:  "#60a5fa",
    particle2: "#93c5fd",
  },
  light: {
    skyTop:    "#bfdbfe",
    skyBot:    "#e0f2fe",
    stars:     "#2563eb",
    mountain:  "#93c5fd",
    mountain2: "#a5d0fb",
    treeDark:  "#1d6b3a",
    treeMid:   "#22873e",
    treeLit:   "#34a853",
    treeHigh:  "#5bc47a",
    trunk:     "#5c3a1e",
    farGnd:    "#5a9838",
    farGndTex: "#4e8a2e",
    farGndTop: "#68a846",
    midGnd:    "#4a8830",
    midGndTex: "#3e7a26",
    midGndTop: "#58983a",
    nearGnd:   "#3a7828",
    nearGndTex:"#306a20",
    nearGndTop:"#488832",
    ground1:   "#7cb342",
    ground2:   "#8bc34a",
    grass1:    "#4caf50",
    grass2:    "#66bb6a",
    grass3:    "#81c784",
    rock:      "#9e9e9e",
    rockHi:    "#bdbdbd",
    mushCap:   "#e53935",
    mushStem:  "#f5f5f0",
    particle:  "#ffeb3b",
    particle2: "#fff176",
  }
};

var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
var pal = isDark ? PALETTES.dark : PALETTES.light;

/* ── Canvas Setup ────────────────────────────────── */
var heroEl = document.getElementById("pixel-hero");
var canvas = document.getElementById("pixel-canvas");
var ctx    = canvas.getContext("2d", {alpha:false});
var W, H, cols, rows;

function resize(){
  W = heroEl.clientWidth;
  H = heroEl.clientHeight;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
  cols = Math.ceil(W / PX);
  rows = Math.ceil(H / PX);
  buildAllLayers();
}

/* ── Snap helper ─────────────────────────────────── */
function snap(v){ return Math.round(v / PX) * PX; }

/* ── Offscreen layer factory ─────────────────────── */
function makeOff(w, h){
  var c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

/* ── Seeded random for deterministic layouts ─────── */
var seed = 42;
function srand(s){ seed = s; }
function rand(){ seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }
function randInt(a,b){ return a + Math.floor(rand()*(b-a+1)); }

/* ── Layer offscreen canvases ────────────────────── */
var offSky, offMountains, offTreesFar, offTreesMid, offTreesNear, offGround;
var LAYER_EXTRA = 120;

/* ── Build: Sky + Stars ──────────────────────────── */
function buildSky(){
  var w = W + LAYER_EXTRA * 2;
  var h = H;
  offSky = makeOff(w, h);
  var c = offSky.getContext("2d");

  for(var r = 0; r < Math.ceil(h/PX); r++){
    var t = r / (Math.ceil(h/PX) - 1);
    c.fillStyle = lerpColor(pal.skyTop, pal.skyBot, t);
    c.fillRect(0, r*PX, w, PX);
  }

  if(isDark){
    srand(123);
    var starCount = Math.floor((w * h) / 4000);
    for(var i = 0; i < starCount; i++){
      var sx = snap(rand() * w);
      var sy = snap(rand() * h * 0.55);
      var size = rand() > 0.7 ? PX*2 : PX;
      var alpha = 0.3 + rand() * 0.7;
      c.globalAlpha = alpha;
      c.fillStyle = pal.stars;
      c.fillRect(sx, sy, size, size);
    }
    c.globalAlpha = 1;
  }
}

/* ── Build: Mountains (background ridge) ─────────── */
function buildMountains(){
  var w = W + LAYER_EXTRA * 2;
  var h = H;
  offMountains = makeOff(w, h);
  var c = offMountains.getContext("2d");

  srand(77);
  drawMountainRidge(c, w, h, 0.55, 0.18, pal.mountain,  14);
  drawMountainRidge(c, w, h, 0.60, 0.14, pal.mountain2, 10);
}

function drawMountainRidge(c, w, h, baseY, amplitude, color, segW){
  var base = h * baseY;
  var amp  = h * amplitude;
  var segs = Math.ceil(w / (PX * segW));
  var pts = [];
  for(var i = 0; i <= segs; i++){
    var x = snap((i / segs) * w);
    var y = snap(base - (Math.sin(rand()*Math.PI*2)*0.5+0.5) * amp - rand()*amp*0.4);
    pts.push({x: x, y: y});
  }

  c.fillStyle = color;
  for(var i = 0; i < pts.length - 1; i++){
    var x0 = pts[i].x, y0 = pts[i].y;
    var x1 = pts[i+1].x, y1 = pts[i+1].y;
    var steps = Math.ceil((x1 - x0) / PX);
    for(var s = 0; s <= steps; s++){
      var t = s / steps;
      var x = snap(x0 + t * (x1 - x0));
      var y = snap(y0 + t * (y1 - y0));
      c.fillRect(x, y, PX, h - y);
    }
  }
}

/* ── Build: Tree layer ───────────────────────────── */
function buildTreeLayer(seedVal, density, scaleMin, scaleMax, baseYFrac, colors, gnd){
  var w = W + LAYER_EXTRA * 2;
  var h = H;
  var off = makeOff(w, h);
  var c = off.getContext("2d");

  if(gnd){
    var gndY = snap(h * baseYFrac);
    var gndCols = Math.ceil(w / PX);
    var gndRows = Math.ceil((h - gndY) / PX);

    c.fillStyle = gnd.base;
    c.fillRect(0, gndY, w, h - gndY);

    srand(seedVal + 5000);
    for(var r = 0; r < gndRows; r++){
      for(var col = 0; col < gndCols; col++){
        if(rand() > 0.55){
          c.fillStyle = gnd.tex;
          c.fillRect(col * PX, gndY + r * PX, PX, PX);
        }
      }
    }

    srand(seedVal + 6000);
    for(var col = 0; col < gndCols; col++){
      var vary = PX * randInt(0, 2);
      c.fillStyle = gnd.top;
      c.fillRect(col * PX, gndY - vary, PX, PX + vary);
      if(rand() > 0.6){
        c.fillRect(col * PX, gndY - vary - PX, PX, PX);
      }
    }
  }

  srand(seedVal);
  var count = Math.floor(w / (PX * density));
  for(var i = 0; i < count; i++){
    var tx = snap(rand() * w);
    var scale = scaleMin + rand() * (scaleMax - scaleMin);
    var baseY = snap(h * baseYFrac + rand() * h * 0.06);
    drawPixelTree(c, tx, baseY, scale, colors);
  }
  return off;
}

function drawPixelTree(c, x, baseY, scale, colors){
  var s = Math.round(scale);
  var p = PX;
  var trunkW = p * Math.max(1, Math.round(s * 0.4));
  var trunkH = p * Math.round(s * 1.2);

  c.fillStyle = pal.trunk;
  var trunkX = x - Math.floor(trunkW/2);
  c.fillRect(snap(trunkX), snap(baseY - trunkH), trunkW, trunkH);

  var layers = Math.max(3, Math.round(s * 1.5));
  var maxWidth = p * Math.round(s * 2.5);
  var layerH = p * Math.round(s * 0.7);
  var startY = baseY - trunkH;

  for(var l = 0; l < layers; l++){
    var t = l / (layers - 1);
    var rowWidth = Math.max(p, snap(maxWidth * (1 - t * 0.82)));
    var yOff = snap(-l * layerH * 0.65);
    var lx = snap(x - rowWidth / 2);
    var ly = snap(startY + yOff);

    c.fillStyle = colors[l % colors.length];
    c.fillRect(lx, ly, rowWidth, layerH);

    if(l < layers - 1){
      var inset = Math.max(p, snap(rowWidth * 0.2));
      c.fillStyle = colors[(l+1) % colors.length];
      c.fillRect(lx + inset, ly - p, rowWidth - inset*2, p);
    }
  }

  c.fillStyle = colors[colors.length - 1];
  var capW = Math.max(p, p * Math.round(s * 0.5));
  var capY = snap(startY - layers * layerH * 0.65);
  c.fillRect(snap(x - capW/2), capY, capW, p);
  c.fillRect(snap(x - p/2), capY - p, p, p);
}

function buildTrees(){
  offTreesFar  = buildTreeLayer(200, 12, 1.5, 2.5, 0.52, [pal.treeDark, pal.treeMid],
    {base: pal.farGnd, tex: pal.farGndTex, top: pal.farGndTop});
  offTreesMid  = buildTreeLayer(300, 8,  2.5, 4.0, 0.56, [pal.treeMid, pal.treeLit, pal.treeDark],
    {base: pal.midGnd, tex: pal.midGndTex, top: pal.midGndTop});
  offTreesNear = buildTreeLayer(400, 6,  3.5, 5.5, 0.62, [pal.treeLit, pal.treeHigh, pal.treeMid],
    {base: pal.nearGnd, tex: pal.nearGndTex, top: pal.nearGndTop});
}

/* ── Build: Ground with grass, rocks, mushrooms ──── */
function buildGround(){
  var w = W + LAYER_EXTRA * 2;
  var h = H;
  offGround = makeOff(w, h);
  var c = offGround.getContext("2d");

  var groundY = snap(h * 0.72);

  c.fillStyle = pal.ground1;
  c.fillRect(0, groundY, w, h - groundY);

  srand(500);
  for(var row = 0; row < Math.ceil((h - groundY)/PX); row++){
    var y = groundY + row * PX;
    for(var col = 0; col < Math.ceil(w/PX); col++){
      var x = col * PX;
      if(rand() > 0.6){
        c.fillStyle = pal.ground2;
        c.fillRect(x, y, PX, PX);
      }
    }
  }

  srand(600);
  for(var i = 0; i < Math.ceil(w / PX); i++){
    var gx = i * PX;
    if(rand() > 0.35){
      var gh = PX * randInt(1,3);
      c.fillStyle = [pal.grass1, pal.grass2, pal.grass3][randInt(0,2)];
      c.fillRect(gx, groundY - gh, PX, gh);
    }
  }

  srand(601);
  var clusterCount = Math.floor(w / (PX * 15));
  for(var i = 0; i < clusterCount; i++){
    var cx = snap(rand() * w);
    var blades = randInt(3,7);
    for(var b = 0; b < blades; b++){
      var bx = cx + (b - Math.floor(blades/2)) * PX;
      var bh = PX * randInt(2,5);
      c.fillStyle = [pal.grass1, pal.grass2, pal.grass3][randInt(0,2)];
      c.fillRect(snap(bx), groundY - bh, PX, bh);
    }
  }

  srand(700);
  var rockCount = Math.floor(w / (PX * 30));
  for(var i = 0; i < rockCount; i++){
    var rx = snap(rand() * w);
    var ry = snap(groundY - PX);
    var rw = PX * randInt(2,4);
    var rh = PX * randInt(1,2);
    c.fillStyle = pal.rock;
    c.fillRect(rx, ry, rw, rh);
    c.fillStyle = pal.rockHi;
    c.fillRect(rx, ry, rw, PX);
  }

  srand(800);
  var mushCount = Math.floor(w / (PX * 50));
  for(var i = 0; i < mushCount; i++){
    var mx = snap(rand() * w);
    var my = snap(groundY - PX);
    c.fillStyle = pal.mushStem;
    c.fillRect(mx, my - PX, PX, PX*2);
    c.fillStyle = pal.mushCap;
    c.fillRect(mx - PX, my - PX*2, PX*3, PX);
    c.fillRect(mx, my - PX*3, PX, PX);
  }
}

/* ── Particles (fireflies) ───────────────────────── */
var MAX_PARTICLES = 50;
var particles = [];

function initParticles(){
  particles = [];
  srand(999);
  for(var i = 0; i < MAX_PARTICLES; i++){
    particles.push({
      x: rand() * W,
      y: rand() * H * 0.75,
      vx: (rand() - 0.5) * 0.3,
      vy: (rand() - 0.5) * 0.2,
      size: rand() > 0.6 ? PX * 2 : PX,
      phase: rand() * Math.PI * 2,
      speed: 0.5 + rand() * 1.5,
    });
  }
}

function updateParticles(t){
  for(var i = 0; i < particles.length; i++){
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy + Math.sin(t * p.speed + p.phase) * 0.15;
    if(p.x < -PX*2) p.x = W + PX;
    if(p.x > W + PX*2) p.x = -PX;
    if(p.y < -PX*2) p.y = H * 0.7;
    if(p.y > H * 0.75) p.y = -PX;
  }
}

function drawParticles(t){
  for(var i = 0; i < particles.length; i++){
    var p = particles[i];
    var alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * p.speed + p.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.size > PX ? pal.particle2 : pal.particle;
    ctx.fillRect(snap(p.x), snap(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/* ── Mouse tracking (scoped to hero) ─────────────── */
var mouseX = 0, mouseY = 0;
heroEl.addEventListener("mousemove", function(e){
  var rect = heroEl.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
});

/* ── Parallax factors per layer ──────────────────── */
var PARALLAX = [
  0.02,  // sky
  0.06,  // mountains
  0.12,  // trees far
  0.22,  // trees mid
  0.38,  // trees near
  0.55,  // ground
];

/* ── Color helpers ───────────────────────────────── */
function hexToRgb(hex){
  var n = parseInt(hex.slice(1),16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function rgbToHex(r,g,b){
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function lerpColor(a,b,t){
  var c1=hexToRgb(a), c2=hexToRgb(b);
  return rgbToHex(
    Math.round(c1[0]+(c2[0]-c1[0])*t),
    Math.round(c1[1]+(c2[1]-c1[1])*t),
    Math.round(c1[2]+(c2[2]-c1[2])*t)
  );
}

/* ── Build all layers ────────────────────────────── */
function buildAllLayers(){
  buildSky();
  buildMountains();
  buildTrees();
  buildGround();
  initParticles();
}

/* ── Render loop ─────────────────────────────────── */
var smoothMX = 0, smoothMY = 0;

function render(time){
  var t = time * 0.001;

  smoothMX += (mouseX - smoothMX) * 0.05;
  smoothMY += (mouseY - smoothMY) * 0.05;

  ctx.fillStyle = pal.skyBot;
  ctx.fillRect(0, 0, W, H);

  var layers = [offSky, offMountains, offTreesFar, offTreesMid, offTreesNear, offGround];
  for(var i = 0; i < layers.length; i++){
    var ox = -LAYER_EXTRA + smoothMX * PARALLAX[i] * LAYER_EXTRA;
    var oy = smoothMY * PARALLAX[i] * 15;
    ctx.drawImage(layers[i], ox, oy);
  }

  updateParticles(t);
  drawParticles(t);

  requestAnimationFrame(render);
}

/* ── Theme integration ───────────────────────────── */
document.addEventListener('theme-changed', function(e) {
  isDark = e.detail.theme === 'dark';
  pal = isDark ? PALETTES.dark : PALETTES.light;
  buildAllLayers();
});

/* ── Init ────────────────────────────────────────── */
window.addEventListener("resize", resize);
resize();
requestAnimationFrame(render);

/* ── Fade out fog overlay ────────────────────────── */
var fog = document.getElementById('pixel-fog');
canvas.style.visibility = 'visible';
if(fog){
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      fog.classList.add('hidden');
      fog.addEventListener('transitionend', function(){ fog.remove(); });
      setTimeout(function(){ if(fog.parentNode) fog.remove(); }, 2500);
    });
  });
}

})();
