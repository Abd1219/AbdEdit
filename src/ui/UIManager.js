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
                if (!target) return;
                
                // If it's a dropdown trigger, the initDropdown will handle it
                if (target.id === 'arrowBtn' || target.id === 'shapeBtn') return;
                
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
            if (!e.target.closest('.tool-dropdown') && !e.target.closest('.dropdown-menu')) {
                document.querySelectorAll('.dropdown-menu').forEach(m => {
                    m.classList.remove('show');
                });
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('dropdown-open'));
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
            if (otherMenu) {
                otherMenu.classList.remove('show');
                const otherBtn = document.getElementById(otherMenuId === 'arrowMenu' ? 'arrowBtn' : 'shapeBtn');
                if (otherBtn) otherBtn.classList.remove('dropdown-open');
            }
            
            const isOpen = menu.classList.toggle('show');
            btn.classList.toggle('dropdown-open', isOpen);
            
            if (isOpen) {
                this.positionMenu(btn, menu);
            }
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

    positionMenu(btn, menu) {
        const rect = btn.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Reset inline styles to allow CSS media queries to take over
            menu.style.top = 'auto';
            menu.style.left = '10px';
            menu.style.right = '10px';
            menu.style.width = 'calc(100% - 20px)';
            menu.style.bottom = '90px';
            menu.style.position = 'fixed';
            menu.style.zIndex = '10002';
            return;
        }
        
        // Desktop positioning
        menu.style.position = 'fixed';
        menu.style.bottom = 'auto';
        menu.style.top = `${rect.bottom + 10}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.right = 'auto';
        menu.style.width = 'auto';
        menu.style.zIndex = '10002';
        
        // Prevent going off-screen to the right
        const menuRect = menu.getBoundingClientRect();
        if (rect.left + menuRect.width > window.innerWidth) {
            menu.style.left = `${window.innerWidth - menuRect.width - 20}px`;
        }
    }

    showToast(message) {
        const toast = document.getElementById('statusToast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.animation = 'fadeIn 0.3s ease forwards';
        
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3000);
    }
}
