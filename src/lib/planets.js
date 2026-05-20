export const PLANETS = ['nauvis', 'vulcanus', 'fulgora', 'gleba', 'aquilo', 'space'];

export const PLANET_LABEL = {
  nauvis: 'Nauvis',
  vulcanus: 'Vulcanus',
  fulgora: 'Fulgora',
  gleba: 'Gleba',
  aquilo: 'Aquilo',
  space: 'Space'
};

export const PLANET_COLOR = {
  nauvis: '#3b82f6',
  vulcanus: '#ef4444',
  fulgora: '#a855f7',
  gleba: '#22c55e',
  aquilo: '#06b6d4',
  space: '#f59e0b'
};

const PLANET_NODE_IDS = {
  vulcanus: [
    'lava', 'calcite', 'tungsten-ore', 'molten-iron', 'molten-copper',
    'tungsten-carbide', 'tungsten-plate', 'foundry', 'metallurgic-science-pack',
    'big-mining-drill'
  ],
  fulgora: [
    'scrap', 'holmium-ore', 'holmium-plate', 'supercapacitor', 'lightning-rod',
    'recycler', 'electromagnetic-plant', 'electromagnetic-science-pack'
  ],
  gleba: [
    'yumako', 'jellynut', 'yumako-mash', 'jelly', 'nutrients', 'bioflux',
    'pentapod-egg', 'biochamber', 'agricultural-science-pack', 'spoilage',
    'carbon-fiber'
  ],
  aquilo: [
    'ice', 'fluorine', 'ammonia', 'lithium-brine', 'lithium', 'lithium-plate',
    'fluoroketone-hot', 'fluoroketone-cold', 'cryogenic-plant',
    'cryogenic-science-pack', 'fusion-reactor', 'fusion-generator',
    'quantum-processor', 'railgun-turret', 'superconductor'
  ],
  space: [
    'metallic-asteroid-chunk', 'carbonic-asteroid-chunk', 'oxide-asteroid-chunk',
    'promethium-asteroid-chunk', 'carbon', 'promethium-science-pack',
    'thruster', 'asteroid-collector', 'cargo-bay', 'space-platform-foundation',
    'space-science-pack'
  ]
};

const BUILDING_PLANET = {
  'foundry': 'vulcanus',
  'electromagnetic-plant': 'fulgora',
  'biochamber': 'gleba',
  'cryogenic-plant': 'aquilo'
};

export function inferPlanets(node) {
  const tags = new Set();
  for (const [planet, ids] of Object.entries(PLANET_NODE_IDS)) {
    if (ids.includes(node.id)) tags.add(planet);
  }
  if (Array.isArray(node.made_in)) {
    const planetOnly = node.made_in.filter((b) => BUILDING_PLANET[b]);
    const others = node.made_in.filter((b) => !BUILDING_PLANET[b]);
    for (const b of planetOnly) tags.add(BUILDING_PLANET[b]);
    if (others.length > 0 && tags.size === 0) tags.add('nauvis');
  }
  if (tags.size === 0) tags.add('nauvis');
  return [...tags];
}
