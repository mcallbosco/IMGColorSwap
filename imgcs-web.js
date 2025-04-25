/* IMGColorSwap Web - Command Builder */

const channelOptions = ['R', 'G', 'B', 'A'];

function initializeChannelInputs() {
  // Set default values and add change listeners for selects
  for (let i = 0; i < 4; i++) {
    const sel = document.getElementById('chan' + i);
    sel.value = channelOptions[i];
    sel.addEventListener('change', function () {
      updateCommandOutput();
      updatePreview();
    });
  }
}

function getChannelOrder() {
  let order = '';
  for (let i = 0; i < 4; i++) {
    order += (document.getElementById('chan' + i).value || '').toUpperCase();
  }
  return order;
}

function validateChannelOrder(order) {
  if (order.length !== 4) return false;
  const chars = order.toUpperCase().split('');
  const valid = ['R', 'G', 'B', 'A'];
  return chars.every(c => valid.includes(c));
}

function buildCommand() {
  const folder = document.getElementById('folderPath').value.trim();
  const recursive = document.getElementById('recursive').checked;
  const order = getChannelOrder();
  let cmd = 'python IMGCS.py';
  if (folder) cmd += ' "' + folder.replace(/"/g, '\\"') + '"';
  if (recursive) cmd += ' --recursive';
  if (order !== 'GRAB') cmd += ' --channel_order ' + order;
  return cmd;
}

function updateCommandOutput() {
  const order = getChannelOrder();
  const cmdDiv = document.getElementById('cmdOutput');
  if (!validateChannelOrder(order)) {
    cmdDiv.textContent = 'Invalid channel order (must be 4 characters: R, G, B, or A)';
    return;
  }
  cmdDiv.textContent = buildCommand();
}

function getChannelData(imageData, channel) {
  const data = imageData.data;
  const out = new Uint8ClampedArray(data.length / 4);
  let offset;
  switch (channel) {
    case 'R': offset = 0; break;
    case 'G': offset = 1; break;
    case 'B': offset = 2; break;
    case 'A': offset = 3; break;
  }
  for (let i = 0, j = offset; i < out.length; i++, j += 4) {
    out[i] = data[j];
  }
  return out;
}

function mergeChannels(channels, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4 + 0] = channels[0][i]; // R
    out[i * 4 + 1] = channels[1][i]; // G
    out[i * 4 + 2] = channels[2][i]; // B
    out[i * 4 + 3] = channels[3][i]; // A
  }
  return new ImageData(out, width, height);
}

function processImage(file, order, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Extract channels
      const rgba = {
        'R': getChannelData(imageData, 'R'),
        'G': getChannelData(imageData, 'G'),
        'B': getChannelData(imageData, 'B'),
        'A': getChannelData(imageData, 'A')
      };

      // Merge channels in specified order
      const channels = [
        rgba[order[0]],
        rgba[order[1]],
        rgba[order[2]],
        rgba[order[3]]
      ];
      const newImageData = mergeChannels(channels, img.width, img.height);
      ctx.putImageData(newImageData, 0, 0);

      canvas.toBlob(function (blob) {
        callback(blob, canvas, img);
      }, 'image/png');
    };
    img.onerror = function () {
      callback(null, null, null, 'Failed to load image.');
    };
    img.src = e.target.result;
  };
  reader.onerror = function () {
    callback(null, null, null, 'Failed to read file.');
  };
  reader.readAsDataURL(file);
}

function updatePreview() {
  const files = document.getElementById('fileInput').files;
  const order = getChannelOrder();
  const previewArea = document.getElementById('previewArea');
  previewArea.innerHTML = '';
  if (!validateChannelOrder(order)) {
    previewArea.textContent = 'Invalid channel order (must be 4 characters: R, G, B, or A)';
    return;
  }
  if (!files.length) {
    previewArea.textContent = 'No PNG files selected.';
    return;
  }
  Array.from(files).forEach(file => {
    if (!file.name.toLowerCase().endsWith('.png')) return;
    processImage(file, order, function (blob, canvas, origImg, error) {
      const div = document.createElement('div');
      div.style.marginBottom = '1.5em';
      if (error) {
        div.textContent = file.name + ' (error: ' + error + ')';
      } else {
        div.innerHTML = `<strong>${file.name}</strong><br>`;
        // Original image
        const orig = document.createElement('img');
        orig.src = URL.createObjectURL(file);
        orig.style.maxWidth = '120px';
        orig.style.maxHeight = '120px';
        orig.title = 'Original';
        orig.style.marginRight = '1em';
        // Processed image
        const proc = document.createElement('img');
        proc.src = URL.createObjectURL(blob);
        proc.style.maxWidth = '120px';
        proc.style.maxHeight = '120px';
        proc.title = 'Processed';
        // Download link
        const a = document.createElement('a');
        a.href = proc.src;
        a.download = file.name.replace(/\.png$/i, '_corrected.png');
        a.textContent = 'Download';
        a.style.display = 'block';
        a.style.marginTop = '0.5em';
        div.appendChild(orig);
        div.appendChild(proc);
        div.appendChild(a);
      }
      previewArea.appendChild(div);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initializeChannelInputs();
  document.getElementById('recursive').addEventListener('change', updateCommandOutput);
  document.getElementById('folderPath').addEventListener('input', updateCommandOutput);
  document.getElementById('buildCmdBtn').addEventListener('click', updateCommandOutput);
  document.getElementById('fileInput').addEventListener('change', updatePreview);
  updateCommandOutput();
  updatePreview();

  // Synth Patch Mode logic
  const synthBtn = document.getElementById('toggleSynthMode');
  const controls = document.querySelector('.controls-container');
  const synthPatch = document.getElementById('synthPatchContainer');

  let synthMode = false;

  synthBtn.addEventListener('click', () => {
    synthMode = !synthMode;
    controls.style.display = synthMode ? 'none' : '';
    synthPatch.style.display = synthMode ? '' : 'none';
    synthBtn.textContent = synthMode ? 'Normal Mode' : 'Synth Patch Mode';
  });

  // Synth patch cable logic
  const svg = document.getElementById('synthPatchSVG');
  const inputJacks = Array.from(document.querySelectorAll('#synthInputs .synth-jack'));
  const outputJacks = Array.from(document.querySelectorAll('#synthOutputs .synth-jack'));
  let connections = [];
  let dragging = null; // {from: 'R', to: null, line: SVGLineElement}

  function getJackCenter(jack) {
    const rect = jack.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - svgRect.left,
      y: rect.top + rect.height / 2 - svgRect.top
    };
  }

  // Helper to create a Bézier SVG path for a cable
  function createCablePath(x1, y1, x2, y2, ctrl) {
    // ctrl: {x, y} control point for the curve
    return `M${x1},${y1} Q${ctrl.x},${ctrl.y} ${x2},${y2}`;
  }

  // Store cable animations
  let cableAnimations = [];

  function redrawCables() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Draw existing connections
    for (const conn of connections) {
      const fromJack = inputJacks.find(j => j.dataset.chan === conn.from);
      const toJack = outputJacks.find(j => j.dataset.chan === conn.to);
      if (fromJack && toJack) {
        const from = getJackCenter(fromJack);
        const to = getJackCenter(toJack);
        let ctrl = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        if (conn._ctrl) ctrl = conn._ctrl;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', createCablePath(from.x, from.y, to.x, to.y, ctrl));
        path.setAttribute('stroke', '#f39c12');
        path.setAttribute('stroke-width', '4');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }
    }
    // Draw dragging cable
    if (dragging && dragging.path) {
      svg.appendChild(dragging.path);
    }
  }

  // Drag from input to output
  inputJacks.forEach(jack => {
    jack.addEventListener('mousedown', e => {
      if (dragging) return;
      const start = getJackCenter(jack);
      dragging = {
        from: jack.dataset.chan,
        to: null,
        path: document.createElementNS('http://www.w3.org/2000/svg', 'path'),
        start,
        ctrl: { x: start.x, y: start.y }, // control point for physics
        v: { x: 0, y: 0 }, // velocity for physics
        max: null // {x, y}
      };
      dragging.path.setAttribute('stroke', '#3498db');
      dragging.path.setAttribute('stroke-width', '4');
      dragging.path.setAttribute('stroke-linecap', 'round');
      dragging.path.setAttribute('fill', 'none');
      redrawCables();
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      requestAnimationFrame(physicsDragStep);
    });
  });

  function onDragMove(e) {
    if (!dragging) return;
    const svgRect = svg.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    dragging.target = { x, y };
    // Track max distance for slack (optional, can be removed if not needed)
    const dx = x - dragging.start.x;
    const dy = y - dragging.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!dragging.max || dist > dragging.max.dist) {
      dragging.max = { x, y, dist };
    }
  }

  function physicsDragStep() {
    if (!dragging) return;
    // Physics for control point (midpoint between start and target, plus vertical slack)
    const start = dragging.start;
    const target = dragging.target || start;
    const mx = (start.x + target.x) / 2;
    const my = (start.y + target.y) / 2;
    // The "rest" position for the control point is the midpoint plus slack in y
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let slack = 20; // always have at least 20px slack
    if (dragging.max) {
      const maxDist = dragging.max.dist;
      if (dist < maxDist - 10) {
        // Slack increases with maxDist (longer cables droop more, but less dramatic)
        slack += Math.max(20, Math.min(800, (maxDist - dist) * (maxDist / 1000)));
      }
    }
    const rest = { x: mx, y: my + slack };

    // Spring physics (more laggy/smooth)
    const stiffness = 0.08;
    const damping = 0.82;
    const mass = 1;
    const fx = (rest.x - dragging.ctrl.x) * stiffness;
    const fy = (rest.y - dragging.ctrl.y) * stiffness;
    dragging.v.x += fx / mass;
    dragging.v.y += fy / mass;
    dragging.v.x *= damping;
    dragging.v.y *= damping;
    dragging.ctrl.x += dragging.v.x;
    dragging.ctrl.y += dragging.v.y;

    // Draw
    dragging.path.setAttribute('d', createCablePath(start.x, start.y, target.x, target.y, dragging.ctrl));
    redrawCables();
    requestAnimationFrame(physicsDragStep);
  }

  function onDragEnd(e) {
    if (!dragging) return;
    // Check if released over an output jack
    const svgRect = svg.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    const over = outputJacks.find(jack => {
      const rect = jack.getBoundingClientRect();
      return (
        x >= rect.left - svgRect.left &&
        x <= rect.right - svgRect.left &&
        y >= rect.top - svgRect.top &&
        y <= rect.bottom - svgRect.top
      );
    });
    if (over) {
      // Remove any existing connection to this output or from this input
      connections = connections.filter(conn => conn.to !== over.dataset.chan && conn.from !== dragging.from);
      // Initial control point for animation
      const from = dragging.start;
      const to = getJackCenter(over);
      const ctrl = { ...dragging.ctrl };
      const v = { ...dragging.v };
      const conn = { from: dragging.from, to: over.dataset.chan, _ctrl: ctrl, _v: v };
      connections.push(conn);
      animateCablePhysics(conn, from, to);
    }
    dragging = null;
    redrawCables();
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
  }

  // Animate cable control point to straight line with physics
  function animateCablePhysics(conn, from, to) {
    let vibratePhase = 0;
    let vibrateAmp = 0;
    function step() {
      // Target is midpoint between from and to
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const rest = { x: mx, y: my };
      // Spring physics (slower contraction)
      const stiffness = 0.08;
      const damping = 0.82;
      const mass = 1;
      const fx = (rest.x - conn._ctrl.x) * stiffness;
      const fy = (rest.y - conn._ctrl.y) * stiffness;
      conn._v.x += fx / mass;
      conn._v.y += fy / mass;
      conn._v.x *= damping;
      conn._v.y *= damping;
      conn._ctrl.x += conn._v.x;
      conn._ctrl.y += conn._v.y;

      // Vibration when nearly straight and velocity is high
      const vMag = Math.sqrt(conn._v.x * conn._v.x + conn._v.y * conn._v.y);
      const ctrlDist = Math.sqrt((conn._ctrl.x - rest.x) ** 2 + (conn._ctrl.y - rest.y) ** 2);
      if (ctrlDist < 2 && vMag > 1) {
        vibrateAmp = Math.min(30, vMag * 8); // amplitude proportional to velocity
      }
      if (vibrateAmp > 0.1) {
        vibratePhase += 0.35 + Math.min(0.25, vMag * 0.1);
        conn._ctrl.y = rest.y + Math.sin(vibratePhase) * vibrateAmp;
        vibrateAmp *= 0.5; // very fast decay for ultra-brief vibration
      }

      redrawCables();
      // Stop if close enough and vibration is gone
      if (
        (Math.abs(conn._ctrl.x - rest.x) > 0.5 ||
        Math.abs(conn._ctrl.y - rest.y) > 0.5 ||
        Math.abs(conn._v.x) > 0.5 ||
        Math.abs(conn._v.y) > 0.5 ||
        vibrateAmp > 0.5)
      ) {
        requestAnimationFrame(step);
      } else {
        conn._ctrl = rest;
        conn._v = { x: 0, y: 0 };
        redrawCables();
      }
    }
    requestAnimationFrame(step);
  }

  // Redraw cables on window resize or mode toggle
  window.addEventListener('resize', redrawCables);
  synthBtn.addEventListener('click', () => setTimeout(redrawCables, 100));
  // Redraw on jack position changes (future-proof)
  inputJacks.concat(outputJacks).forEach(jack => {
    new ResizeObserver(redrawCables).observe(jack);
  });
  // Initial draw
  redrawCables();

  // Dark mode toggle logic
  const darkToggle = document.getElementById('darkModeToggle');
  const body = document.body;
  const DARK_KEY = 'imgcs-darkmode';

  function setDarkMode(on) {
    if (on) {
      body.classList.add('dark');
      localStorage.setItem(DARK_KEY, '1');
    } else {
      body.classList.remove('dark');
      localStorage.setItem(DARK_KEY, '0');
    }
  }

  // Initialize from localStorage
  setDarkMode(localStorage.getItem(DARK_KEY) === '1');

  darkToggle.addEventListener('click', () => {
    setDarkMode(!body.classList.contains('dark'));
  });
});
