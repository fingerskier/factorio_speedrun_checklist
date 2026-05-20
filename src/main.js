import './style.css';
import { renderChecklist, STORAGE_KEY } from './views/checklist.js';
import { renderGraph } from './views/graph.js';

const defaultSession = {
  name: 'Default Run',
  checklist: null,
  checked: {}
};

const VIEW_KEY = 'factorio-checklist-view';

async function loadDefaultChecklist() {
  const res = await fetch(`${import.meta.env.BASE_URL}checklist.json`);
  return res.json();
}

let cachedRecipes = null;
async function loadRecipes() {
  if (cachedRecipes) return cachedRecipes;
  const res = await fetch(`${import.meta.env.BASE_URL}recipes.json`);
  cachedRecipes = await res.json();
  return cachedRecipes;
}

function makeShell() {
  const app = document.querySelector('#app');
  app.innerHTML = '';

  const nav = document.createElement('nav');
  nav.className = 'view-nav';
  const tabChecklist = document.createElement('button');
  tabChecklist.textContent = 'Checklist';
  tabChecklist.dataset.view = 'checklist';
  const tabGraph = document.createElement('button');
  tabGraph.textContent = 'Recipe Graph';
  tabGraph.dataset.view = 'graph';
  nav.append(tabChecklist, tabGraph);

  const main = document.createElement('main');
  main.className = 'view-main';

  app.append(nav, main);
  return { nav, main, tabs: { checklist: tabChecklist, graph: tabGraph } };
}

(async () => {
  const shell = makeShell();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  const checklist = await loadDefaultChecklist();
  const state = saved || { ...defaultSession, checklist };
  if (!state.checklist) state.checklist = checklist;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  let currentView = localStorage.getItem(VIEW_KEY) || 'checklist';

  async function show(view) {
    currentView = view;
    localStorage.setItem(VIEW_KEY, view);
    for (const [k, btn] of Object.entries(shell.tabs)) {
      btn.classList.toggle('active', k === view);
    }
    shell.main.className = 'view-main view-' + view;
    if (view === 'checklist') {
      renderChecklist(shell.main, state);
    } else if (view === 'graph') {
      shell.main.innerHTML = '<div class="loading">Loading recipes…</div>';
      const recipes = await loadRecipes();
      renderGraph(shell.main, recipes);
    }
  }

  shell.tabs.checklist.onclick = () => show('checklist');
  shell.tabs.graph.onclick = () => show('graph');

  show(currentView);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }
})();
