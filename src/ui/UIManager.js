export class UIManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.tool-btn');
                if (!target || target.id === 'arrowBtn' || target.id === 'shapeBtn') return;
                
                const tool = target.dataset.tool;
                if (tool) this.setTool(tool);
            });
        });

        // Dropdown menus
        this.initDropdown('arrowBtn', 'arrowMenu', 'shapeMenu', {
            'line': '─', 'arrow': '➡️', 'curved-arrow': '↪️', 'measure-arrow': '📐'
        });
        this.initDropdown('shapeBtn', 'shapeMenu', 'arrowMenu', {
            'rectangle': '⬜', 'ellipse': '⭕', 'triangle': '🔺', 'angle': '∠', 'polygon': '◇'
        });

        // Global click to close dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tool-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
            }
        });

        // Color and width
        document.getElementById('colorPicker').addEventListener('input', (e) => this.app.updateCurrentColor(e.target.value));
        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            document.getElementById('strokeValue').textContent = val;
            this.app.updateCurrentWidth(val);
        });

        // File controls
        document.getElementById('imageInput').addEventListener('change', (e) => this.app.handleImageUpload(e));
        
        // Export button is handled in index.html via onclick, we'll fix that later or just keep the reference here
        // Actually the plan says remove onclick, so let's do it right.
    }

    initDropdown(btnId, menuId, otherMenuId, icons) {
        const btn = document.getElementById(btnId);
        const menu = document.getElementById(menuId);
        const otherMenu = document.getElementById(otherMenuId);
        if (!btn || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (otherMenu) otherMenu.classList.remove('show');
            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.left = rect.left + 'px';
            menu.classList.toggle('show');
        });

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const tool = item.dataset.tool;
                if (tool) {
                    this.setTool(tool, btn, icons[tool]);
                    menu.classList.remove('show');
                }
            });
        });
    }

    setTool(tool, dropdownBtn, icon) {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if (dropdownBtn) {
            dropdownBtn.classList.add('active');
            dropdownBtn.innerHTML = `${icon}<span class="dropdown-arrow">▼</span>`;
        } else {
            const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
            if (btn) btn.classList.add('active');
        }
        this.app.currentTool = tool;
    }

    updateControls(ann) {
        if (!ann) {
            this.hideSelectionButtons();
            return;
        }
        
        document.getElementById('deleteBtn').style.display = 'flex';
        const isEditable = ['text', 'measure-arrow'].includes(ann.tool);
        document.getElementById('editTextBtn').style.display = isEditable ? 'flex' : 'none';
        
        if (ann.color) document.getElementById('colorPicker').value = ann.color;
        const strokeW = ann.strokeWidth !== undefined ? ann.strokeWidth : (ann.width !== undefined ? ann.width : null);
        if (strokeW) {
            document.getElementById('strokeWidth').value = strokeW;
            document.getElementById('strokeValue').textContent = strokeW;
        }
    }

    hideSelectionButtons() {
        document.getElementById('deleteBtn').style.display = 'none';
        document.getElementById('editTextBtn').style.display = 'none';
    }
}
