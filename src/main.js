import { StateManager } from './core/StateManager.js';
import { CanvasEngine } from './core/CanvasEngine.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
import { UIManager } from './ui/UIManager.js';
import { EventManager } from './ui/EventManager.js';

class AbdEditApp {
    constructor() {
        this.state = new StateManager();
        this.engine = new CanvasEngine('canvas');
        this.ui = new UIManager(this);
        this.events = new EventManager(this, this.engine.canvas);

        this.currentTool = 'select';
        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        
        this.startX = 0;
        this.startY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.resizeHandle = null;
        
        this.selectedAnnotation = null;
        this.selectedAnnotationIndex = -1;

        this.init();
    }

    init() {
        // Set initial size
        this.engine.setSize(1000, 600);
        this.render();

        // Responsive handling
        window.addEventListener('resize', () => {
            this.fitCanvasToScreen();
        });
    }

    render() {
        this.engine.render(this.engine.image, this.state.annotations, this.selectedAnnotation);
    }

    handleDown(e) {
        const coords = this.engine.getCoordinates(e);
        this.startX = coords.x;
        this.startY = coords.y;

        if (this.currentTool === 'select') {
            // Check resize handles first
            if (this.selectedAnnotation) {
                const handle = ToolRegistry.getResizeHandle(this.selectedAnnotation, coords.x, coords.y, this.engine.ctx);
                if (handle) {
                    this.isResizing = true;
                    this.resizeHandle = handle;
                    this.render();
                    return;
                }
            }

            // Check for clicks on existing annotations
            const index = this.findAnnotationAt(coords.x, coords.y);
            if (index !== -1) {
                this.selectAnnotation(index);
                const handle = ToolRegistry.getResizeHandle(this.selectedAnnotation, coords.x, coords.y, this.engine.ctx);
                if (handle) {
                    this.isResizing = true;
                    this.resizeHandle = handle;
                } else {
                    this.isDragging = true;
                    this.dragOffsetX = coords.x;
                    this.dragOffsetY = coords.y;
                }
                this.render();
                return;
            }

            // Deselect if clicking empty space
            this.deselect();
            return;
        } else {
            // If drawing, deselect current annotation
            this.deselect();
        }

        // Start drawing
        this.isDrawing = true;
        if (this.currentTool === 'text') {
            this.addText();
        } else if (this.currentTool === 'pencil') {
            this.state.addAnnotation({
                tool: 'pencil',
                points: [{x: this.startX, y: this.startY}],
                color: document.getElementById('colorPicker').value,
                width: parseInt(document.getElementById('strokeWidth').value)
            });
        }
    }

    handleMove(e) {
        const coords = this.engine.getCoordinates(e);
        const { x, y } = coords;

        if (this.isDragging && this.selectedAnnotation) {
            const dx = x - this.dragOffsetX;
            const dy = y - this.dragOffsetY;
            ToolRegistry.moveAnnotation(this.selectedAnnotation, dx, dy);
            this.dragOffsetX = x;
            this.dragOffsetY = y;
            this.render();
            return;
        }

        if (this.isResizing && this.selectedAnnotation) {
            ToolRegistry.resizeAnnotation(this.selectedAnnotation, this.resizeHandle, x, y);
            this.render();
            return;
        }

        this.updateCursor(x, y);

        if (!this.isDrawing) return;

        if (this.currentTool === 'pencil') {
            const current = this.state.annotations[this.state.annotations.length - 1];
            current.points.push({x, y});
            this.render();
        } else {
            this.renderPreview(x, y);
        }
    }

    handleUp(e) {
        if (this.isDragging || this.isResizing) {
            this.isDragging = false;
            this.isResizing = false;
            this.resizeHandle = null;
            this.state.saveHistory();
            return;
        }

        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        const coords = this.engine.getCoordinates(e);
        this.finalizeDrawing(coords.x, coords.y);
        this.render();
    }

    finalizeDrawing(endX, endY) {
        if (this.currentTool === 'pencil' || this.currentTool === 'select' || this.currentTool === 'text') return;

        const color = document.getElementById('colorPicker').value;
        const width = parseInt(document.getElementById('strokeWidth').value);
        let ann = { tool: this.currentTool, color, width, strokeWidth: width };

        switch(this.currentTool) {
            case 'line':
            case 'arrow':
                Object.assign(ann, { startX: this.startX, startY: this.startY, endX, endY });
                break;
            case 'curved-arrow':
                const midX = (this.startX + endX) / 2, midY = (this.startY + endY) / 2;
                const dx = endX - this.startX, dy = endY - this.startY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                ann.startX = this.startX; ann.startY = this.startY; ann.endX = endX; ann.endY = endY;
                ann.controlX = midX - dy / dist * (dist * 0.2);
                ann.controlY = midY + dx / dist * (dist * 0.2);
                break;
            case 'measure-arrow':
                const text = prompt('Medida (ej: 5m, 10cm):', '');
                if (!text) return;
                Object.assign(ann, { startX: this.startX, startY: this.startY, endX, endY, measureText: text.trim() });
                break;
            case 'rectangle':
            case 'ellipse':
            case 'triangle':
            case 'highlight':
            case 'blur':
                ann.x = Math.min(this.startX, endX);
                ann.y = Math.min(this.startY, endY);
                ann.width = Math.abs(endX - this.startX);
                ann.height = Math.abs(endY - this.startY);
                break;
            case 'circle':
                ann.x = this.startX; ann.y = this.startY;
                ann.radius = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
                break;
            case 'angle':
                const len = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
                Object.assign(ann, { vertexX: this.startX, vertexY: this.startY, line1EndX: this.startX + len, line1EndY: this.startY, line2EndX: this.startX, line2EndY: this.startY - len });
                break;
            case 'polygon':
                const w = Math.abs(endX - this.startX), h = Math.abs(endY - this.startY);
                const x = Math.min(this.startX, endX), y = Math.min(this.startY, endY);
                ann.points = [{x, y}, {x: x+w, y}, {x: x+w, y: y+h}, {x, y: y+h}];
                break;
        }

        this.state.addAnnotation(ann);
    }

    renderPreview(x, y) {
        this.render();
        const color = document.getElementById('colorPicker').value;
        const strokeW = parseInt(document.getElementById('strokeWidth').value);
        
        let previewAnn = {
            tool: this.currentTool,
            startX: this.startX, startY: this.startY, endX: x, endY: y,
            x: Math.min(this.startX, x), y: Math.min(this.startY, y),
            width: Math.abs(x - this.startX), height: Math.abs(y - this.startY),
            radius: Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)),
            color: color, strokeWidth: strokeW,
            measureText: '?'
        };

        if (['pencil', 'line', 'arrow', 'curved-arrow', 'measure-arrow', 'angle'].includes(this.currentTool)) {
            previewAnn.width = strokeW;
        }

        if (this.currentTool === 'curved-arrow') {
            const midX = (this.startX + x) / 2, midY = (this.startY + y) / 2;
            const dx = x - this.startX, dy = y - this.startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            previewAnn.controlX = midX - dy / dist * (dist * 0.2);
            previewAnn.controlY = midY + dx / dist * (dist * 0.2);
        } else if (this.currentTool === 'angle') {
            const len = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
            previewAnn.vertexX = this.startX; previewAnn.vertexY = this.startY;
            previewAnn.line1EndX = this.startX + len; previewAnn.line1EndY = this.startY;
            previewAnn.line2EndX = this.startX; previewAnn.line2EndY = this.startY - len;
        } else if (this.currentTool === 'polygon') {
            const w = Math.abs(x - this.startX), h = Math.abs(y - this.startY);
            const px = Math.min(this.startX, x), py = Math.min(this.startY, y);
            previewAnn.points = [{x: px, y: py}, {x: px+w, y: py}, {x: px+w, y: py+h}, {x: px, y: py+h}];
        }

        this.engine.drawAnnotation(previewAnn);
    }

    findAnnotationAt(x, y) {
        for (let i = this.state.annotations.length - 1; i >= 0; i--) {
            if (ToolRegistry.isPointInAnnotation(this.state.annotations[i], x, y, this.engine.ctx)) return i;
        }
        return -1;
    }

    selectAnnotation(index) {
        this.selectedAnnotationIndex = index;
        this.selectedAnnotation = this.state.annotations[index];
        this.ui.updateControls(this.selectedAnnotation);
    }

    deselect() {
        this.selectedAnnotation = null;
        this.selectedAnnotationIndex = -1;
        this.ui.hideSelectionButtons();
        this.render();
    }

    updateCurrentColor(color) {
        if (this.selectedAnnotation) {
            this.selectedAnnotation.color = color;
            this.render();
        }
    }

    updateCurrentWidth(width) {
        if (this.selectedAnnotation) {
            if (['pencil', 'line', 'arrow', 'curved-arrow', 'measure-arrow', 'angle'].includes(this.selectedAnnotation.tool)) {
                this.selectedAnnotation.width = width;
            } else {
                this.selectedAnnotation.strokeWidth = width;
            }
            this.render();
        }
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.engine.setImage(img);
                this.state.reset();
                this.fitCanvasToScreen();
                this.render();
                
                document.getElementById('uploadHint').style.display = 'none';
                this.ui.showToast('Imagen cargada con éxito');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    fitCanvasToScreen() {
        if (!this.engine.image) return;
        
        const container = document.getElementById('dropZone');
        const containerWidth = container.clientWidth - 20;
        const containerHeight = container.clientHeight - 20;
        
        const img = this.engine.image;
        const scale = Math.min(containerWidth / img.width, containerHeight / img.height, 1);
        
        this.engine.canvas.style.width = (img.width * scale) + 'px';
        this.engine.canvas.style.height = (img.height * scale) + 'px';
    }

    addText() {
        const text = prompt('Texto:');
        if (!text) return;
        const size = parseInt(prompt('Tamaño (12-72):', '50')) || 50;
        this.state.addAnnotation({
            tool: 'text', text, x: this.startX, y: this.startY + size,
            color: document.getElementById('colorPicker').value, fontSize: size, height: size
        });
        this.render();
    }

    handleDoubleClick(e) {
        const coords = this.engine.getCoordinates(e);
        const idx = this.findAnnotationAt(coords.x, coords.y);
        if (idx !== -1) {
            const ann = this.state.annotations[idx];
            if (ann.tool === 'text') this.editText(ann);
            else if (ann.tool === 'measure-arrow') this.editMeasure(ann);
        }
    }

    editText(ann) {
        const txt = prompt('Editar texto:', ann.text);
        if (txt !== null) ann.text = txt || ann.text;
        const size = prompt('Tamaño:', ann.fontSize);
        if (size) ann.fontSize = ann.height = Math.max(12, Math.min(72, parseInt(size)));
        this.state.saveHistory();
        this.render();
    }

    editMeasure(ann) {
        const m = prompt('Medida:', ann.measureText);
        if (m !== null) ann.measureText = m.trim() || ann.measureText;
        this.state.saveHistory();
        this.render();
    }

    undo() { if (this.state.undo()) { this.deselect(); this.render(); } }
    redo() { if (this.state.redo()) { this.deselect(); this.render(); } }
    deleteSelected() { if (this.selectedAnnotationIndex !== -1) { this.state.removeAnnotation(this.selectedAnnotationIndex); this.deselect(); } }
    clearAnnotations() { if (confirm('¿Limpiar todo?')) { this.state.clearAnnotations(); this.deselect(); } }
    exportImage() {
        const link = document.createElement('a');
        link.download = `abdedit-${Date.now()}.png`;
        link.href = this.engine.canvas.toDataURL();
        link.click();
    }

    updateCursor(x, y) {
        if (this.selectedAnnotation) {
            const handle = ToolRegistry.getResizeHandle(this.selectedAnnotation, x, y, this.engine.ctx);
            if (handle) { this.engine.canvas.style.cursor = 'pointer'; return; }
            if (ToolRegistry.isPointInAnnotation(this.selectedAnnotation, x, y, this.engine.ctx)) { this.engine.canvas.style.cursor = 'move'; return; }
        }
        const hovered = this.findAnnotationAt(x, y);
        this.engine.canvas.style.cursor = hovered !== -1 ? 'pointer' : 'crosshair';
    }
}

// Global instance to maintain compatibility with some existing parts if needed
window.app = new AbdEditApp();
