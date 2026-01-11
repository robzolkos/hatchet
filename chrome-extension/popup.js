// Hatchet for Fizzy - Popup Script

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadBoards();
  setupForm();
  setupProtocolLink();
}

// Load and display configured boards
async function loadBoards() {
  const result = await chrome.storage.local.get(['boardPaths']);
  const boardPaths = result.boardPaths || {};
  
  const listEl = document.getElementById('boards-list');
  
  if (Object.keys(boardPaths).length === 0) {
    listEl.innerHTML = `
      <p class="empty-state">
        No boards configured yet. Visit a Fizzy card and click the Hatchet button to add one.
      </p>
    `;
    return;
  }

  listEl.innerHTML = '';
  
  for (const [boardId, data] of Object.entries(boardPaths)) {
    // Handle both old format (string path) and new format (object with path and boardName)
    const path = typeof data === 'string' ? data : data.path;
    const name = typeof data === 'string' ? boardId : (data.boardName || boardId);
    
    const itemEl = document.createElement('div');
    itemEl.className = 'board-item';
    itemEl.innerHTML = `
      <div class="board-info">
        <div class="board-name">${escapeHtml(name)}</div>
        <div class="board-path">${escapeHtml(path)}</div>
      </div>
      <div class="board-actions">
        <button class="btn-icon" data-action="edit" data-board-id="${escapeHtml(boardId)}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon btn-danger" data-action="delete" data-board-id="${escapeHtml(boardId)}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Add event listeners
    itemEl.querySelector('[data-action="edit"]').addEventListener('click', () => editBoard(boardId, name, path));
    itemEl.querySelector('[data-action="delete"]').addEventListener('click', () => deleteBoard(boardId));
    
    listEl.appendChild(itemEl);
  }
}

// Setup the add board form
function setupForm() {
  const form = document.getElementById('add-board-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const boardId = document.getElementById('board-id').value.trim();
    const boardName = document.getElementById('board-name').value.trim();
    const projectPath = document.getElementById('project-path').value.trim();
    
    if (!boardId || !boardName || !projectPath) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    // Save to storage
    const result = await chrome.storage.local.get(['boardPaths']);
    const boardPaths = result.boardPaths || {};
    boardPaths[boardId] = { path: projectPath, boardName };
    await chrome.storage.local.set({ boardPaths });
    
    // Clear form and reload
    form.reset();
    showToast('Board added successfully', 'success');
    await loadBoards();
  });
}

// Edit a board
async function editBoard(boardId, currentName, currentPath) {
  const newPath = prompt('Enter new project path:', currentPath);
  if (newPath === null) return; // Cancelled
  
  const newName = prompt('Enter board name:', currentName);
  if (newName === null) return; // Cancelled
  
  if (!newPath.trim()) {
    showToast('Path cannot be empty', 'error');
    return;
  }
  
  // Update storage
  const result = await chrome.storage.local.get(['boardPaths']);
  const boardPaths = result.boardPaths || {};
  boardPaths[boardId] = { path: newPath.trim(), boardName: newName.trim() || currentName };
  await chrome.storage.local.set({ boardPaths });
  
  showToast('Board updated', 'success');
  await loadBoards();
}

// Delete a board
async function deleteBoard(boardId) {
  if (!confirm('Remove this board configuration?')) return;
  
  const result = await chrome.storage.local.get(['boardPaths']);
  const boardPaths = result.boardPaths || {};
  delete boardPaths[boardId];
  await chrome.storage.local.set({ boardPaths });
  
  showToast('Board removed', 'success');
  await loadBoards();
}

// Setup protocol handler link
function setupProtocolLink() {
  document.getElementById('protocol-link').addEventListener('click', (e) => {
    e.preventDefault();
    // Open a new tab with instructions
    chrome.tabs.create({
      url: 'https://github.com/yourusername/hatchet#protocol-handler-linux'
    });
  });
}

// Show toast notification
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
