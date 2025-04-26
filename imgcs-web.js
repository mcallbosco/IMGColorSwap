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
      updateChannelMappingDisplay();
    });
  }
  updateChannelMappingDisplay();
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
    updateChannelMappingDisplay();
    return;
  }
  cmdDiv.textContent = buildCommand();
  updateChannelMappingDisplay();
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

function getCurrentChannelOrder() {
  const synthPatch = document.getElementById('synthPatchContainer');
  const synthVisible = synthPatch && synthPatch.style.display !== 'none';
  if (synthVisible) {
    // Use connections for synth patch mode
    const outputs = ['R','G','B','A'];
    return outputs.map(out => {
      const conn = connections.find(c => c.to === out);
      return conn ? conn.from : '_';
    }).join('');
  } else {
    // Use selects for normal mode
    return getChannelOrder();
  }
}

function updatePreview() {
  const files = document.getElementById('fileInput').files;
  const order = getCurrentChannelOrder();
  const previewArea = document.getElementById('previewArea');
  previewArea.innerHTML = '';
  if (!validateChannelOrder(order)) {
    previewArea.textContent = 'Invalid channel order (must be 4 characters: R, G, B, or A)';
    return;
  }
  if (!files.length) {
    // Show example image if no files uploaded, and process it with the current channel order
    const div = document.createElement('div');
    div.style.marginBottom = '1.5em';
    div.innerHTML = `<strong>Example Image</strong><br>`;
    // Original image (example)
    const orig = document.createElement('img');
    orig.src = 'upscaled_image.png';
    orig.style.maxWidth = '120px';
    orig.style.maxHeight = '120px';
    orig.title = 'Example';
    orig.style.marginRight = '1em';
    orig.addEventListener('click', () => showImageModal(orig.src, orig.title));
    div.appendChild(orig);
    // Processed image (process upscaled_image.png with current order)
    processImageURL('upscaled_image.png', order, function(blob, canvas, origImg, error) {
      if (error) {
        const errDiv = document.createElement('div');
        errDiv.textContent = 'Error processing example image: ' + error;
        div.appendChild(errDiv);
      } else {
        const proc = document.createElement('img');
        proc.src = URL.createObjectURL(blob);
        proc.style.maxWidth = '120px';
        proc.style.maxHeight = '120px';
        proc.title = 'Processed Example';
        proc.addEventListener('click', () => showImageModal(proc.src, proc.title));
        // Download link
        const a = document.createElement('a');
        a.href = proc.src;
        a.download = 'upscaled_image.png';
        a.className = 'download-icon-btn material-symbols-outlined';
        a.title = 'Download';
        a.innerText = 'download';
        a.style.display = 'inline-block';
        a.style.marginTop = '0.5em';
        a.style.marginLeft = '1em';
        div.appendChild(proc);
        div.appendChild(a);
      }
      previewArea.appendChild(div);
    });
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
        orig.addEventListener('click', () => showImageModal(orig.src, orig.title));
        // Processed image
        const proc = document.createElement('img');
        proc.src = URL.createObjectURL(blob);
        proc.style.maxWidth = '120px';
        proc.style.maxHeight = '120px';
        proc.title = 'Processed';
        proc.addEventListener('click', () => showImageModal(proc.src, proc.title));
        // Download link
        const a = document.createElement('a');
        a.href = proc.src;
        a.download = file.name.replace(/\.png$/i, '_corrected.png');
        a.className = 'download-icon-btn material-symbols-outlined';
        a.title = 'Download';
        a.innerText = 'download';
        a.style.display = 'inline-block';
        a.style.marginTop = '0.5em';
        a.style.marginLeft = '1em';
        div.appendChild(orig);
        div.appendChild(proc);
        div.appendChild(a);
      }
      previewArea.appendChild(div);
    });
  });
}

let connections = [];
function updateChannelMappingDisplay() {
  // If in synth patch mode, show mapping based on connections
  const synthPatch = document.getElementById('synthPatchContainer');
  const controls = document.querySelector('.controls-container');
  const display = document.getElementById('channelMappingDisplay');
  if (!display) return;

  // Determine if synth patch is visible
  const synthVisible = synthPatch && synthPatch.style.display !== 'none';
  if (synthVisible) {
    // For each output (R,G,B,A), find the input it's connected to
    const outputs = ['R','G','B','A'];
    let mapping = outputs.map(out => {
      const conn = connections.find(c => c.to === out);
      return conn ? conn.from : '_';
    }).join('');
    display.textContent = `RGBA → ${mapping}`;
  } else {
    // Normal mode: use selects
    const order = [
      document.getElementById('chan0').value,
      document.getElementById('chan1').value,
      document.getElementById('chan2').value,
      document.getElementById('chan3').value
    ];
    display.textContent = `RGBA → ${order.join('')}`;
  }
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
  const buildCmdBtn = document.getElementById('buildCmdBtn');

  // Start in synth mode by default
  let synthMode = true;
  controls.style.display = 'none';
  synthPatch.style.display = '';
  synthBtn.textContent = 'Command Builder Mode';
  if (buildCmdBtn) buildCmdBtn.style.display = '';

  synthBtn.addEventListener('click', () => {
    synthMode = !synthMode;
    controls.style.display = synthMode ? 'none' : '';
    synthPatch.style.display = synthMode ? '' : 'none';
    synthBtn.textContent = synthMode ? 'Command Builder Mode' : 'Synth Patch Mode';
    if (buildCmdBtn) buildCmdBtn.style.display = synthMode ? '' : 'none';
    updateChannelMappingDisplay();
    updatePreview();
  });

  // Synth patch cable logic
  const svg = document.getElementById('synthPatchSVG');
  const inputJacks = Array.from(document.querySelectorAll('#synthInputs .synth-jack'));
  const outputJacks = Array.from(document.querySelectorAll('#synthOutputs .synth-jack'));
  let dragging = null; // {from: 'R', to: null, line: SVGLineElement}

  // Track hover state for output jacks
  const outputJackHoverState = new Map();

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

    // Reset all output and input jacks first
    outputJacks.forEach(jack => jack.classList.remove('connected'));
    inputJacks.forEach(jack => {
      // Do not reset border color for the jack being dragged
      if (!dragging || jack.dataset.chan !== dragging.from) {
        jack.style.borderColor = '';
      }
    });

    // Draw all cables (paths) first
    const JACK_RADIUS = 18; // px, adjust if needed to match CSS
    const ARC_ANIMATION_DURATION = 200; // ms (even faster)

    for (const conn of connections) {
      const fromJack = inputJacks.find(j => j.dataset.chan === conn.from);
      const toJack = outputJacks.find(j => j.dataset.chan === conn.to);
      if (fromJack && toJack) {
        const from = getJackCenter(fromJack);
        const to = getJackCenter(toJack);
        let ctrl = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        if (conn._ctrl) ctrl = conn._ctrl;

        function edgePoint(center, toward, radius) {
          const dx = toward.x - center.x;
          const dy = toward.y - center.y;
          const angle = Math.atan2(dy, dx);
          return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
            angle
          };
        }

        const fromEdge = edgePoint(from, ctrl, JACK_RADIUS);
        const toEdge = edgePoint(to, ctrl, JACK_RADIUS);

        let cableColor;
        switch (conn.from) {
          case 'R': cableColor = '#e74c3c'; break;
          case 'G': cableColor = '#2ecc71'; break;
          case 'B': cableColor = '#3498db'; break;
          case 'A': cableColor = '#95a5a6'; break;
          default: cableColor = '#f39c12'; break;
        }

        // Set input jack border color to cable color
        fromJack.style.borderColor = cableColor;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', createCablePath(fromEdge.x, fromEdge.y, toEdge.x, toEdge.y, ctrl));
        path.setAttribute('stroke', cableColor);
        path.setAttribute('stroke-width', '4');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);

        // Animate border arc around the output jack (toJack)
        if (!conn.arcStartTime) conn.arcStartTime = performance.now();
        const now = performance.now();
        const elapsed = Math.min(1, (now - conn.arcStartTime) / ARC_ANIMATION_DURATION);
        // Schedule a redraw after the animation duration to remove lingering arc
        if (elapsed < 1 && !conn._redrawScheduled) {
          conn._redrawScheduled = true;
          setTimeout(() => {
            conn._redrawScheduled = false;
            redrawCables();
          }, ARC_ANIMATION_DURATION + 10);
        }

        // Re-enable arc animation
        if (elapsed < 1) {
          const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const arcRadius = 16;
          const arcStart = toEdge.angle;
          let arcProgress;
          if (elapsed < 0.75) {
            arcProgress = Math.min(1, elapsed * (1 / 0.75));
          } else {
            arcProgress = 1 - 0.25 * (1 - (elapsed - 0.75) / 0.25);
          }
          const arcLen = 2 * Math.PI * Math.min(arcProgress, 1);
          const arcEnd = arcStart + arcLen;
          function polar(cx, cy, r, a) {
            return {
              x: cx + r * Math.cos(a),
              y: cy + r * Math.sin(a)
            };
          }
          const arcCenter = getJackCenter(toJack);
          const startPt = polar(arcCenter.x, arcCenter.y, arcRadius, arcStart);
          const endPt = polar(arcCenter.x, arcCenter.y, arcRadius, arcEnd);
          const largeArc = arcLen > Math.PI ? 1 : 0;
          const arcPath = [
            'M', startPt.x, startPt.y,
            'A', arcRadius, arcRadius, 0, largeArc, 1, endPt.x, endPt.y
          ].join(' ');
          arc.setAttribute('d', arcPath);
          arc.setAttribute('stroke', cableColor);
          arc.setAttribute('stroke-width', '3');
          arc.setAttribute('fill', 'none');
          arc.setAttribute('stroke-linecap', 'round');
          svg.appendChild(arc);
        }

        // After animation, set output jack border color to cable color
        if (elapsed >= 1) {
          toJack.style.borderColor = cableColor;
        }
      }
    }

    if (dragging && dragging.path) {
      svg.appendChild(dragging.path);
    }

    // After all cables are drawn, set output jack border color to match the most recent connection (if any)
    outputJacks.forEach(jack => {
      if (outputJackHoverState.get(jack)) {
        // If hovered, keep the muted color set by mouseenter
        return;
      }
      // Find all connections to this output
      const conns = connections.filter(conn => conn.to === jack.dataset.chan);
      if (conns.length > 0) {
        // Mix the colors of all connected cables
        const colors = conns.map(conn => {
          switch (conn.from) {
            case 'R': return [231, 76, 60]; // #e74c3c
            case 'G': return [46, 204, 113]; // #2ecc71
            case 'B': return [52, 152, 219]; // #3498db
            case 'A': return [149, 165, 166]; // #95a5a6
            default: return [243, 156, 18]; // #f39c12
          }
        });
        // Average the RGB values
        const avg = colors.reduce((acc, c) => [acc[0]+c[0], acc[1]+c[1], acc[2]+c[2]], [0,0,0]).map(v => Math.round(v/colors.length));
        const cableColor = `rgb(${avg[0]},${avg[1]},${avg[2]})`;
        jack.style.borderColor = cableColor;
      } else {
        jack.style.borderColor = '';
      }
    });
    updateChannelMappingDisplay();
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
      // Set cable color based on channel
      let cableColor;
      switch (dragging.from) {
        case 'R': cableColor = '#e74c3c'; break;
        case 'G': cableColor = '#2ecc71'; break;
        case 'B': cableColor = '#3498db'; break;
        case 'A': cableColor = '#95a5a6'; break;
        default: cableColor = '#f39c12'; break;
      }
      dragging.path.setAttribute('stroke', cableColor);
      dragging.path.setAttribute('stroke-width', '4');
      dragging.path.setAttribute('stroke-linecap', 'round');
      dragging.path.setAttribute('fill', 'none');
      // Set input jack border color while dragging
      jack.style.borderColor = cableColor;
      redrawCables();
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      requestAnimationFrame(physicsDragStep);
    });
    // Touch support: start drag
    jack.addEventListener('touchstart', e => {
      if (dragging) return;
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      // Simulate mouse logic
      const start = getJackCenter(jack);
      dragging = {
        from: jack.dataset.chan,
        to: null,
        path: document.createElementNS('http://www.w3.org/2000/svg', 'path'),
        start,
        ctrl: { x: start.x, y: start.y },
        v: { x: 0, y: 0 },
        max: null
      };
      let cableColor;
      switch (dragging.from) {
        case 'R': cableColor = '#e74c3c'; break;
        case 'G': cableColor = '#2ecc71'; break;
        case 'B': cableColor = '#3498db'; break;
        case 'A': cableColor = '#95a5a6'; break;
        default: cableColor = '#f39c12'; break;
      }
      dragging.path.setAttribute('stroke', cableColor);
      dragging.path.setAttribute('stroke-width', '4');
      dragging.path.setAttribute('stroke-linecap', 'round');
      dragging.path.setAttribute('fill', 'none');
      jack.style.borderColor = cableColor;
      redrawCables();
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
      requestAnimationFrame(physicsDragStep);
    }, { passive: false });
    // Muted color on hover
    jack.addEventListener('mouseenter', e => {
      if (dragging) return;
      let mutedColor;
      switch (jack.dataset.chan) {
        case 'R': mutedColor = '#e57373'; break;
        case 'G': mutedColor = '#81c784'; break;
        case 'B': mutedColor = '#64b5f6'; break;
        case 'A': mutedColor = '#b0b0b0'; break;
        default: mutedColor = '#b0b0b0'; break; // fallback muted gray for unknown channel
      }
      jack.style.borderColor = mutedColor;
    });
    jack.addEventListener('mouseleave', e => {
      if (dragging && dragging.from === jack.dataset.chan) return;
      // If connected, keep the cable color
      const isConnected = connections.some(conn => conn.from === jack.dataset.chan);
      if (!isConnected) jack.style.borderColor = '';
    });
    // Add click event listeners to input jacks for disconnecting cables
    jack.addEventListener('click', e => {
      // Remove any connection from this input
      const chan = jack.dataset.chan;
      const before = connections.length;
      connections = connections.filter(conn => conn.from !== chan);
      if (connections.length !== before) {
        redrawCables();
        updateChannelMappingDisplay();
        updatePreview();
      }
    });
  });

  // Muted color hover for output jacks
  outputJacks.forEach(jack => {
    jack.addEventListener('mouseenter', e => {
      // Only show muted color if there is no connection
      const conns = connections.filter(conn => conn.to === jack.dataset.chan);
      if (conns.length > 0) return;
      outputJackHoverState.set(jack, true);
      let mutedColor;
      // If dragging, use the muted color of the cable being dragged
      if (dragging) {
        switch (dragging.from) {
          case 'R': mutedColor = '#e57373'; break;
          case 'G': mutedColor = '#81c784'; break;
          case 'B': mutedColor = '#64b5f6'; break;
          case 'A': mutedColor = '#b0b0b0'; break;
          default: mutedColor = '#b0b0b0'; break; // fallback muted gray for unknown channel
        }
      } else {
        // Not dragging, use the muted color of the output's own channel
        switch (jack.dataset.chan) {
          case 'R': mutedColor = '#e57373'; break;
          case 'G': mutedColor = '#81c784'; break;
          case 'B': mutedColor = '#64b5f6'; break;
          case 'A': mutedColor = '#b0b0b0'; break;
          default: mutedColor = '#b0b0b0'; break; // fallback muted gray for unknown channel
        }
      }
      jack.style.borderColor = mutedColor;
    });
    jack.addEventListener('mouseleave', e => {
      outputJackHoverState.set(jack, false);
      // Restore mixed color if there are connections
      const conns = connections.filter(conn => conn.to === jack.dataset.chan);
      if (conns.length > 0) {
        const colors = conns.map(conn => {
          switch (conn.from) {
            case 'R': return [231, 76, 60]; // #e74c3c
            case 'G': return [46, 204, 113]; // #2ecc71
            case 'B': return [52, 152, 219]; // #3498db
            case 'A': return [149, 165, 166]; // #95a5a6
            default: return [243, 156, 18]; // #f39c12
          }
        });
        const avg = colors.reduce((acc, c) => [acc[0]+c[0], acc[1]+c[1], acc[2]+c[2]], [0,0,0]).map(v => Math.round(v/colors.length));
        const cableColor = `rgb(${avg[0]},${avg[1]},${avg[2]})`;
        jack.style.borderColor = cableColor;
      } else {
        jack.style.borderColor = '';
      }
    });
    // Add click event listeners to output jacks for disconnecting cables
    jack.addEventListener('click', e => {
      // Remove any connection to this output
      const chan = jack.dataset.chan;
      const before = connections.length;
      connections = connections.filter(conn => conn.to !== chan);
      if (connections.length !== before) {
        redrawCables();
        updateChannelMappingDisplay();
        updatePreview();
      }
    });
  });

  function onDragMove(e) {
    if (!dragging) return;
    const svgRect = svg.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
      // Touch event
      x = e.touches[0].clientX - svgRect.left;
      y = e.touches[0].clientY - svgRect.top;
      e.preventDefault(); // Prevent scrolling while dragging
    } else {
      // Mouse event
      x = e.clientX - svgRect.left;
      y = e.clientY - svgRect.top;
    }
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
      const stiffness = 0.045;
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
    // Always start the cable at the edge of the input jack
    function edgePoint(center, toward, radius) {
      const dx = toward.x - center.x;
      const dy = toward.y - center.y;
      const angle = Math.atan2(dy, dx);
      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };
    }
    const JACK_RADIUS = 18;
    const fromEdge = edgePoint(start, dragging.ctrl, JACK_RADIUS);
    dragging.path.setAttribute('d', createCablePath(fromEdge.x, fromEdge.y, target.x, target.y, dragging.ctrl));
    // Ensure cable color stays correct during drag
    let cableColor;
    switch (dragging.from) {
      case 'R': cableColor = '#e74c3c'; break;
      case 'G': cableColor = '#2ecc71'; break;
      case 'B': cableColor = '#3498db'; break;
      case 'A': cableColor = '#95a5a6'; break;
      default: cableColor = '#f39c12'; break;
    }
    dragging.path.setAttribute('stroke', cableColor);
    // Set input jack border color while dragging
    const fromJack = inputJacks.find(j => j.dataset.chan === dragging.from);
    if (fromJack) fromJack.style.borderColor = cableColor;
    redrawCables();
    requestAnimationFrame(physicsDragStep);
  }

  function onDragEnd(e) {
    if (!dragging) return;
    const svgRect = svg.getBoundingClientRect();
    let x, y;
    if (e.changedTouches && e.changedTouches.length > 0) {
      // Touch event
      x = e.changedTouches[0].clientX - svgRect.left;
      y = e.changedTouches[0].clientY - svgRect.top;
    } else if (e.touches && e.touches.length > 0) {
      // Fallback for touchend
      x = e.touches[0].clientX - svgRect.left;
      y = e.touches[0].clientY - svgRect.top;
    } else {
      // Mouse event
      x = e.clientX - svgRect.left;
      y = e.clientY - svgRect.top;
    }
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
      connections = connections.filter(conn => conn.from !== dragging.from);
      connections = connections.filter(conn => conn.to !== over.dataset.chan);
      const from = dragging.start;
      const to = getJackCenter(over);
      const ctrl = { ...dragging.ctrl };
      const v = { ...dragging.v };
      const conn = { from: dragging.from, to: over.dataset.chan, _ctrl: ctrl, _v: v };
      connections.push(conn);
      animateCablePhysics(conn, from, to);
      dragging = null;
      redrawCables();
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
      updateChannelMappingDisplay();
      updatePreview();
    } else {
      animateCableReelIn(dragging, () => {
        dragging = null;
        redrawCables();
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        updateChannelMappingDisplay();
        updatePreview();
      });
    }
    const fromJack = inputJacks.find(j => j.dataset.chan === dragging.from);
    if (fromJack) {
      const stillConnected = connections.some(conn => conn.from === dragging.from);
      if (!stillConnected) fromJack.style.borderColor = '';
    }
  }

  // Animate cable "reel in" when released mid-air
  function animateCableReelIn(draggingObj, onDone) {
    const start = draggingObj.start;
    const from = draggingObj.target ? draggingObj.target : start;
    const ctrlStart = { ...draggingObj.ctrl };
    const ctrlEnd = { x: start.x, y: start.y };
    let progress = 0;

    // Find the input jack DOM element closest to start
    let inputJackElem = null;
    let minDist = Infinity;
    for (const jack of inputJacks) {
      const rect = jack.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - svgRect.left;
      const cy = rect.top + rect.height / 2 - svgRect.top;
      const dist = Math.hypot(cx - start.x, cy - start.y);
      if (dist < minDist) {
        minDist = dist;
        inputJackElem = jack;
      }
    }
    // Set background color to cable color (blue for dragging)
    if (inputJackElem) {
      inputJackElem._origBg = inputJackElem.style.backgroundColor;
      // Set border color to channel color
      let cableColor;
      switch (draggingObj.from) {
        case 'R': cableColor = '#e74c3c'; break;
        case 'G': cableColor = '#2ecc71'; break;
        case 'B': cableColor = '#3498db'; break;
        case 'A': cableColor = '#95a5a6'; break;
        default: cableColor = '#f39c12'; break;
      }
      inputJackElem.style.borderColor = cableColor;
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    // Quadratic Bézier interpolation for the cable's end point
    function bezier2(p0, p1, p2, t) {
      const u = 1 - t;
      return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
      };
    }
    // Store last nonzero direction for edge calculation
    let lastEdgeToward = { x: ctrlStart.x, y: ctrlStart.y };
    function step() {
      progress += 0.018;
      if (progress > 1) progress = 1;
      // Gravity effect: blend into the tip's path for a smooth arc
      const gravityStrength = 90; // px, more subtle
      const gravityTip = Math.pow(1 - progress, 2) * gravityStrength * Math.sin(Math.PI * (1 - progress));

      // Animate the cable's end along the original Bézier curve back to the start, then apply gravity to the tip
      const baseTarget = bezier2(from, ctrlStart, start, progress);
      const currTarget = {
        x: baseTarget.x,
        y: baseTarget.y + gravityTip
      };

      // Animate the control point from its original to the start (no gravity or minimal gravity)
      const currCtrl = {
        x: lerp(ctrlStart.x, ctrlEnd.x, progress),
        y: lerp(ctrlStart.y, ctrlEnd.y, progress)
      };

      // Always start the cable at the edge of the input jack for reel-in animation
      function edgePoint(center, toward, radius) {
        const dx = toward.x - center.x;
        const dy = toward.y - center.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return edgePoint(center, lastEdgeToward, radius); // Use last valid direction
        const angle = Math.atan2(dy, dx);
        return {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius
        };
      }
      const JACK_RADIUS = 18;
      // Update lastEdgeToward if direction is valid
      if (Math.abs(currCtrl.x - start.x) > 0.001 || Math.abs(currCtrl.y - start.y) > 0.001) {
        lastEdgeToward = { x: currCtrl.x, y: currCtrl.y };
      }
      const fromEdge = edgePoint(start, currCtrl, JACK_RADIUS);
      draggingObj.path.setAttribute('d', createCablePath(fromEdge.x, fromEdge.y, currTarget.x, currTarget.y, currCtrl));
      redrawCables();
      if (progress < 0.99) {
        requestAnimationFrame(step);
      } else {
        // Remove cable without drawing a line to the center
        draggingObj.path.setAttribute('d', '');
        // Restore jack background color
        if (inputJackElem) {
          inputJackElem.style.backgroundColor = inputJackElem._origBg || "";
          // Reset border color if not connected
          const stillConnected = connections.some(conn => conn.from === draggingObj.from);
          if (!stillConnected) inputJackElem.style.borderColor = '';
        }
        redrawCables();
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(step);
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
      const stiffness = 0.045;
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
        updateChannelMappingDisplay();
      }
    }
    requestAnimationFrame(step);
    updateChannelMappingDisplay();
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

function processImageURL(url, order, callback) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
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
    callback(null, null, null, 'Failed to load example image.');
  };
  img.src = url;
}

function showImageModal(src, title) {
  let modal = document.getElementById('imgcs-image-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imgcs-image-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.style.cursor = 'zoom-out';
    modal.innerHTML = `
      <div style="position:relative; max-width:90vw; max-height:90vh;">
        <button id="imgcs-modal-close" style="position:absolute;top:-2.2em;right:0;font-size:2em;background:none;border:none;color:#fff;cursor:pointer;z-index:2;">&times;</button>
        <img id="imgcs-modal-img" src="" alt="" style="max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 4px 32px #000b;display:block;">
        <div id="imgcs-modal-title" style="color:#fff;text-align:center;margin-top:0.7em;font-size:1.1em;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    // Close on overlay click or close button
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.id === 'imgcs-modal-close') {
        modal.style.display = 'none';
      }
    });
  }
  const img = document.getElementById('imgcs-modal-img');
  const titleDiv = document.getElementById('imgcs-modal-title');
  img.src = src;
  img.alt = title || '';
  titleDiv.textContent = title || '';
  modal.style.display = 'flex';
}
