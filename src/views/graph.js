import * as d3 from 'd3';
import { PLANETS, PLANET_LABEL, PLANET_COLOR, inferPlanets } from '../lib/planets.js';

const NODE_R = 26;
const ICON_SIZE = 32;

export function renderGraph(container, recipes) {
  container.innerHTML = '';

  const nodesById = new Map();
  for (const n of recipes.nodes) {
    nodesById.set(n.id, { ...n, planets: inferPlanets(n) });
  }
  const incoming = new Map();
  const outgoing = new Map();
  for (const e of recipes.edges) {
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to).push(e);
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    outgoing.get(e.from).push(e);
  }

  const sensibleRoots = [
    'rocket-silo', 'space-science-pack', 'utility-science-pack',
    'production-science-pack', 'rocket-part', 'processing-unit',
    'electromagnetic-science-pack', 'metallurgic-science-pack',
    'agricultural-science-pack', 'cryogenic-science-pack',
    'promethium-science-pack', 'quantum-processor', 'foundry',
    'electromagnetic-plant', 'biochamber', 'cryogenic-plant'
  ].filter((id) => nodesById.has(id));

  const state = {
    root: sensibleRoots.includes('rocket-silo') ? 'rocket-silo' : recipes.nodes[recipes.nodes.length - 1].id,
    direction: 'ingredients',
    maxDepth: 3,
    enabledPlanets: new Set(PLANETS),
    expandedIds: new Set()
  };

  const neighborsOf = (id) => {
    const list = state.direction === 'ingredients'
      ? (incoming.get(id) || []).map((e) => e.from)
      : (outgoing.get(id) || []).map((e) => e.to);
    return list.filter((nid) => {
      const n = nodesById.get(nid);
      return n && n.planets.some((p) => state.enabledPlanets.has(p));
    });
  };

  function initExpansion() {
    state.expandedIds = new Set();
    const root = nodesById.get(state.root);
    if (!root || !root.planets.some((p) => state.enabledPlanets.has(p))) return;
    const visited = new Map([[state.root, 0]]);
    const queue = [[state.root, 0]];
    while (queue.length) {
      const [id, d] = queue.shift();
      if (d < state.maxDepth) {
        state.expandedIds.add(id);
        for (const nid of neighborsOf(id)) {
          if (!visited.has(nid)) {
            visited.set(nid, d + 1);
            queue.push([nid, d + 1]);
          }
        }
      }
    }
  }

  function computeVisible() {
    const visible = new Set();
    const root = nodesById.get(state.root);
    if (!root || !root.planets.some((p) => state.enabledPlanets.has(p))) {
      return { nodes: [], edges: [] };
    }
    visible.add(state.root);
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of [...visible]) {
        if (!state.expandedIds.has(id)) continue;
        for (const nid of neighborsOf(id)) {
          if (!visible.has(nid)) { visible.add(nid); changed = true; }
        }
      }
    }
    const edges = recipes.edges
      .filter((e) => visible.has(e.from) && visible.has(e.to))
      .map((e) => ({ ...e }));
    const nodes = [...visible].map((id) => nodesById.get(id));
    return { nodes, edges };
  }

  function hasHiddenNeighbors(id, visibleSet) {
    return neighborsOf(id).some((nid) => !visibleSet.has(nid));
  }

  const layout = document.createElement('div');
  layout.className = 'graph-layout';
  container.append(layout);

  const sidebar = document.createElement('aside');
  sidebar.className = 'graph-sidebar';
  layout.append(sidebar);

  const stage = document.createElement('div');
  stage.className = 'graph-stage';
  layout.append(stage);

  const tooltip = document.createElement('div');
  tooltip.className = 'graph-tooltip';
  stage.append(tooltip);

  function rootOptions() {
    const ids = new Set([...sensibleRoots, ...recipes.nodes.map((n) => n.id)]);
    return [...ids].map((id) => {
      const n = nodesById.get(id);
      return { id, name: n ? n.name : id };
    });
  }

  function renderSidebar() {
    sidebar.innerHTML = '';

    const rootLabel = document.createElement('label');
    rootLabel.className = 'sidebar-block';
    rootLabel.innerHTML = '<span>Root item</span>';
    const rootSelect = document.createElement('select');
    for (const { id, name } of rootOptions()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      if (id === state.root) opt.selected = true;
      rootSelect.append(opt);
    }
    rootSelect.onchange = () => {
      state.root = rootSelect.value;
      initExpansion();
      update();
    };
    rootLabel.append(rootSelect);
    sidebar.append(rootLabel);

    const dirBlock = document.createElement('div');
    dirBlock.className = 'sidebar-block';
    dirBlock.innerHTML = '<span>Traverse</span>';
    const dirGroup = document.createElement('div');
    dirGroup.className = 'pill-group';
    for (const dir of ['ingredients', 'products']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = dir === 'ingredients' ? 'Ingredients (← inputs)' : 'Products (→ outputs)';
      btn.className = 'pill' + (state.direction === dir ? ' active' : '');
      btn.onclick = () => {
        if (state.direction === dir) return;
        state.direction = dir;
        initExpansion();
        update();
      };
      dirGroup.append(btn);
    }
    dirBlock.append(dirGroup);
    sidebar.append(dirBlock);

    const depthBlock = document.createElement('div');
    depthBlock.className = 'sidebar-block';
    const depthLabel = document.createElement('span');
    depthLabel.textContent = `Max depth: ${state.maxDepth}`;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '6';
    slider.value = String(state.maxDepth);
    slider.oninput = () => {
      state.maxDepth = Number(slider.value);
      depthLabel.textContent = `Max depth: ${state.maxDepth}`;
      initExpansion();
      update();
    };
    depthBlock.append(depthLabel, slider);
    sidebar.append(depthBlock);

    const planetBlock = document.createElement('div');
    planetBlock.className = 'sidebar-block';
    planetBlock.innerHTML = '<span>Planets</span>';
    const planetList = document.createElement('div');
    planetList.className = 'planet-list';
    for (const p of PLANETS) {
      const row = document.createElement('label');
      row.className = 'planet-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.enabledPlanets.has(p);
      cb.onchange = () => {
        if (cb.checked) state.enabledPlanets.add(p);
        else state.enabledPlanets.delete(p);
        initExpansion();
        update();
      };
      const dot = document.createElement('span');
      dot.className = 'planet-dot';
      dot.style.background = PLANET_COLOR[p];
      const txt = document.createElement('span');
      txt.textContent = PLANET_LABEL[p];
      row.append(cb, dot, txt);
      planetList.append(row);
    }
    planetBlock.append(planetList);
    sidebar.append(planetBlock);

    const tipBlock = document.createElement('div');
    tipBlock.className = 'sidebar-block sidebar-tip';
    tipBlock.innerHTML = `
      <span>Tips</span>
      <ul>
        <li>Click a node to expand/collapse its neighbors</li>
        <li>Hover an edge for recipe details</li>
        <li>Scroll to zoom, drag to pan</li>
        <li>Nodes with <strong>+</strong> have unloaded neighbors</li>
      </ul>
    `;
    sidebar.append(tipBlock);

    const stats = document.createElement('div');
    stats.className = 'sidebar-block sidebar-stats';
    stats.id = 'graph-stats';
    sidebar.append(stats);
  }

  const svg = d3.select(stage).append('svg').attr('class', 'graph-svg');
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', NODE_R + 8)
    .attr('refY', 0)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#94a3b8');
  defs.append('marker')
    .attr('id', 'arrow-hot')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', NODE_R + 8)
    .attr('refY', 0)
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#fbbf24');

  const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
  const linkLayer = zoomLayer.append('g').attr('class', 'links');
  const nodeLayer = zoomLayer.append('g').attr('class', 'nodes');

  const zoom = d3.zoom()
    .scaleExtent([0.2, 3])
    .on('zoom', (event) => zoomLayer.attr('transform', event.transform));
  svg.call(zoom);

  let simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id((d) => d.id).distance(140).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-500))
    .force('collide', d3.forceCollide().radius(NODE_R + 12))
    .force('center', d3.forceCenter(0, 0))
    .force('x', d3.forceX(0).strength(0.04))
    .force('y', d3.forceY(0).strength(0.04));

  let nodeSel = nodeLayer.selectAll('g');
  let linkSel = linkLayer.selectAll('line');
  const nodePos = new Map();

  function showEdgeTooltip(event, e) {
    const fromNode = nodesById.get(e.from);
    const toNode = nodesById.get(e.to);
    const produces = toNode.produces ?? 1;
    const time = toNode.time != null ? `${toNode.time}s` : '—';
    const madeIn = (toNode.made_in || []).join(', ') || '—';
    tooltip.innerHTML = `
      <div class="tt-row tt-title">
        <img src="${fromNode.img_url}" alt="" />
        <span>${fromNode.name}</span>
        <span class="tt-arrow">→</span>
        <img src="${toNode.img_url}" alt="" />
        <span>${toNode.name}</span>
      </div>
      <div class="tt-row"><strong>${e.qty}</strong> ${fromNode.name} per recipe</div>
      <div class="tt-row">Recipe yields <strong>${produces}</strong> ${toNode.name} in <strong>${time}</strong></div>
      <div class="tt-row">Made in: ${madeIn}</div>
    `;
    positionTooltip(event);
    tooltip.classList.add('visible');
  }

  function positionTooltip(event) {
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left + 14;
    const y = event.clientY - rect.top + 14;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  function update() {
    const { nodes, edges } = computeVisible();
    const visibleSet = new Set(nodes.map((n) => n.id));

    document.getElementById('graph-stats').innerHTML = `
      <span>Nodes: <strong>${nodes.length}</strong></span>
      <span>Edges: <strong>${edges.length}</strong></span>
    `;

    for (const n of nodes) {
      const prev = nodePos.get(n.id);
      if (prev) { n.x = prev.x; n.y = prev.y; n.vx = 0; n.vy = 0; }
      else if (n.id === state.root) { n.x = 0; n.y = 0; }
    }

    linkSel = linkLayer.selectAll('line').data(edges, (d) => `${d.from}->${d.to}`);
    linkSel.exit().remove();
    const linkEnter = linkSel.enter().append('line')
      .attr('class', 'graph-link')
      .attr('marker-end', 'url(#arrow)')
      .on('mouseenter', function (event, e) {
        d3.select(this).classed('hot', true).attr('marker-end', 'url(#arrow-hot)');
        showEdgeTooltip(event, e);
      })
      .on('mousemove', positionTooltip)
      .on('mouseleave', function () {
        d3.select(this).classed('hot', false).attr('marker-end', 'url(#arrow)');
        hideTooltip();
      });
    linkSel = linkEnter.merge(linkSel);

    nodeSel = nodeLayer.selectAll('g.graph-node').data(nodes, (d) => d.id);
    nodeSel.exit().remove();
    const nodeEnter = nodeSel.enter().append('g')
      .attr('class', 'graph-node')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }))
      .on('click', (event, d) => {
        event.stopPropagation();
        if (state.expandedIds.has(d.id)) state.expandedIds.delete(d.id);
        else state.expandedIds.add(d.id);
        update();
      });

    nodeEnter.append('circle')
      .attr('r', NODE_R)
      .attr('class', 'graph-node-bg');

    nodeEnter.append('circle')
      .attr('r', NODE_R + 3)
      .attr('class', 'graph-node-ring')
      .attr('fill', 'none')
      .attr('stroke-width', 2);

    nodeEnter.append('image')
      .attr('href', (d) => d.img_url)
      .attr('x', -ICON_SIZE / 2)
      .attr('y', -ICON_SIZE / 2)
      .attr('width', ICON_SIZE)
      .attr('height', ICON_SIZE)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    nodeEnter.append('text')
      .attr('class', 'graph-node-label')
      .attr('y', NODE_R + 14)
      .attr('text-anchor', 'middle')
      .text((d) => d.name);

    nodeEnter.append('circle')
      .attr('class', 'graph-node-badge')
      .attr('r', 8)
      .attr('cx', NODE_R - 4)
      .attr('cy', -NODE_R + 4);

    nodeEnter.append('text')
      .attr('class', 'graph-node-badge-text')
      .attr('x', NODE_R - 4)
      .attr('y', -NODE_R + 8)
      .attr('text-anchor', 'middle');

    nodeEnter.append('title');

    nodeSel = nodeEnter.merge(nodeSel);

    nodeSel.select('.graph-node-ring')
      .attr('stroke', (d) => PLANET_COLOR[d.planets[0]] || '#64748b');

    nodeSel.classed('is-root', (d) => d.id === state.root);

    nodeSel.select('.graph-node-badge')
      .style('display', (d) => hasHiddenNeighbors(d.id, visibleSet) ? null : 'none');
    nodeSel.select('.graph-node-badge-text')
      .style('display', (d) => hasHiddenNeighbors(d.id, visibleSet) ? null : 'none')
      .text((d) => state.expandedIds.has(d.id) ? '+' : '+');

    nodeSel.select('title')
      .text((d) => {
        const planets = d.planets.map((p) => PLANET_LABEL[p]).join(', ');
        const time = d.time != null ? ` · ${d.time}s` : '';
        const produces = d.produces != null ? ` · yields ${d.produces}` : '';
        return `${d.name}\n${d.category}${time}${produces}\nPlanets: ${planets}`;
      });

    simulation.nodes(nodes).on('tick', () => {
      linkSel
        .attr('x1', (d) => getNode(d.from).x)
        .attr('y1', (d) => getNode(d.from).y)
        .attr('x2', (d) => getNode(d.to).x)
        .attr('y2', (d) => getNode(d.to).y);
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
      for (const n of nodes) nodePos.set(n.id, { x: n.x, y: n.y });
    });
    simulation.force('link').links(edges.map((e) => ({ source: e.from, target: e.to, ...e })));
    simulation.alpha(0.8).restart();

    function getNode(id) {
      const n = nodes.find((nn) => nn.id === id);
      return n || { x: 0, y: 0 };
    }
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    svg.attr('viewBox', `${-rect.width / 2} ${-rect.height / 2} ${rect.width} ${rect.height}`)
      .attr('width', rect.width)
      .attr('height', rect.height);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  renderSidebar();
  resize();
  initExpansion();
  update();
}
