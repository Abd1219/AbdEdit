class AbdEditApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'pencil';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.curveControlX = 0;
        this.curveControlY = 0;
        this.polygonPoints = [];
        this.annotations = [];
        this.history = [];
        this.historyStep = -1;
        this.selectedAnnotation = null;
        this.selectedAnnotationIndex = -1;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.image = null;
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        this.init();
    }

    init() {
        // Set initial canvas size
        this.canvas.width = 1000;
        this.canvas.height = 600;
        
        // Event listeners
        document.getElementById('imageInput').addEventListener('change', (e) => this.loadImage(e));
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Double click to edit text
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Ignorar si es el botón de dropdown
                if (e.target.id === 'arrowBtn' || e.target.closest('#arrowBtn')) {
                    return;
                }
                
                if (e.target.dataset.tool) {
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentTool = e.target.dataset.tool;
                }
            });
        });
        
        // Dropdown de flechas
        const arrowBtn = document.getElementById('arrowBtn');
        const arrowMenu = document.getElementById('arrowMenu');
        const shapeBtn = document.getElementById('shapeBtn');
        const shapeMenu = document.getElementById('shapeMenu');
        
        if (arrowBtn && arrowMenu) {
            arrowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Cerrar el menú de formas si está abierto
                if (shapeMenu) shapeMenu.classList.remove('show');
                
                // Posicionar el menú debajo del botón
                const rect = arrowBtn.getBoundingClientRect();
                arrowMenu.style.top = (rect.bottom + 4) + 'px';
                arrowMenu.style.left = rect.left + 'px';
                
                arrowMenu.classList.toggle('show');
            });
            
            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.tool-dropdown')) {
                    arrowMenu.classList.remove('show');
                    if (shapeMenu) shapeMenu.classList.remove('show');
                }
            });
            
            // Seleccionar tipo de flecha
            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tool = e.target.dataset.tool;
                    if (tool) {
                        this.currentTool = tool;
                        
                        // Actualizar botón activo
                        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                        arrowBtn.classList.add('active');
                        
                        // Actualizar icono del botón según la línea/flecha seleccionada
                        const icons = {
                            'line': '─',
                            'arrow': '➡️',
                            'curved-arrow': '↪️',
                            'measure-arrow': '📐'
                        };
                        const icon = icons[tool] || '➡️';
                        arrowBtn.innerHTML = icon + '<span class="dropdown-arrow">▼</span>';
                        
                        // Cerrar menú
                        arrowMenu.classList.remove('show');
                    }
                });
            });
        }
        
        // Dropdown de formas
        if (shapeBtn && shapeMenu) {
            shapeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Cerrar el menú de flechas si está abierto
                if (arrowMenu) arrowMenu.classList.remove('show');
                
                // Posicionar el menú debajo del botón
                const rect = shapeBtn.getBoundingClientRect();
                shapeMenu.style.top = (rect.bottom + 4) + 'px';
                shapeMenu.style.left = rect.left + 'px';
                
                shapeMenu.classList.toggle('show');
            });
            
            // Ya se maneja el cierre en el event listener de arrowMenu
            
            // Seleccionar tipo de forma
            shapeMenu.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tool = e.target.dataset.tool;
                    if (tool) {
                        this.currentTool = tool;
                        
                        // Actualizar botón activo
                        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                        shapeBtn.classList.add('active');
                        
                        // Actualizar icono del botón según la forma seleccionada
                        const icons = {
                            'rectangle': '⬜',
                            'ellipse': '⭕',
                            'triangle': '🔺',
                            'angle': '∠',
                            'polygon': '◇'
                        };
                        const icon = icons[tool] || '⬜';
                        shapeBtn.innerHTML = icon + '<span class="dropdown-arrow">▼</span>';
                        
                        // Cerrar menú
                        shapeMenu.classList.remove('show');
                    }
                });
            });
        }
        
        // Stroke width
        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            const newWidth = parseInt(e.target.value);
            document.getElementById('strokeValue').textContent = newWidth;
            
            // Si hay una anotación seleccionada, actualizar su grosor
            if (this.selectedAnnotation) {
                if (this.selectedAnnotation.strokeWidth !== undefined) {
                    this.selectedAnnotation.strokeWidth = newWidth;
                } else if (this.selectedAnnotation.width !== undefined && 
                          (this.selectedAnnotation.tool === 'pencil' || 
                           this.selectedAnnotation.tool === 'line' || 
                           this.selectedAnnotation.tool === 'arrow' || 
                           this.selectedAnnotation.tool === 'curved-arrow' || 
                           this.selectedAnnotation.tool === 'measure-arrow')) {
                    this.selectedAnnotation.width = newWidth;
                }
                this.render();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedAnnotation) {
                e.preventDefault();
                this.deleteSelectedAnnotation();
            }
        });
        
        this.render();
    }

    loadImage(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                
                // Usar el tamaño original de la imagen (sin redimensionar)
                // Esto mantiene la máxima calidad
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.tempCanvas.width = img.width;
                this.tempCanvas.height = img.height;
                
                // Calcular el tamaño de visualización máximo
                const maxWidth = window.innerWidth > 768 ? 1200 : window.innerWidth - 40;
                const maxHeight = window.innerHeight > 768 ? 800 : window.innerHeight - 300;
                
                // Ajustar el tamaño visual del canvas con CSS si es necesario
                if (img.width > maxWidth || img.height > maxHeight) {
                    const widthRatio = maxWidth / img.width;
                    const heightRatio = maxHeight / img.height;
                    const scale = Math.min(widthRatio, heightRatio);
                    
                    const displayWidth = Math.floor(img.width * scale);
                    const displayHeight = Math.floor(img.height * scale);
                    
                    this.canvas.style.width = displayWidth + 'px';
                    this.canvas.style.height = displayHeight + 'px';
                } else {
                    // Resetear el estilo si la imagen es pequeña
                    this.canvas.style.width = '';
                    this.canvas.style.height = '';
                }
                
                // Habilitar suavizado en el canvas principal
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                this.annotations = [];
                this.history = [];
                this.historyStep = -1;
                this.render();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleMouseDown(e) {
        const coords = this.getCoordinates(e);
        this.startX = coords.x;
        this.startY = coords.y;
        
        // Si hay una anotación seleccionada, verificar handles primero
        if (this.selectedAnnotation) {
            const handle = this.getResizeHandle(coords.x, coords.y);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.render();
                return;
            }
        }
        
        // Detectar clic en anotaciones existentes
        const clicked = this.findAnnotationAt(coords.x, coords.y);
        if (clicked !== null) {
            this.selectedAnnotationIndex = clicked;
            this.selectedAnnotation = this.annotations[clicked];
            
            // Actualizar el control de grosor con el valor de la anotación seleccionada
            this.updateStrokeWidthControl();
            
            // Verificar si se hizo clic en un handle de redimensionamiento
            const handle = this.getResizeHandle(coords.x, coords.y);
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
        
        // Si no se hizo clic en una anotación, deseleccionar
        if (this.selectedAnnotation) {
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            
            // Ocultar botones de edición
            this.hideEditButtons();
            
            this.render();
        }
        
        // Iniciar dibujo con la herramienta actual
        this.isDrawing = true;
        
        if (this.currentTool === 'text') {
            this.addText();
            return;
        }
        
        if (this.currentTool === 'pencil') {
            this.annotations.push({
                tool: 'pencil',
                points: [{x: this.startX, y: this.startY}],
                color: document.getElementById('colorPicker').value,
                width: parseInt(document.getElementById('strokeWidth').value)
            });
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.handleMouseDown(e);
    }

    handleMouseMove(e) {
        const coords = this.getCoordinates(e);
        const currentX = coords.x;
        const currentY = coords.y;
        
        // Manejar arrastre de anotación seleccionada
        if (this.isDragging && this.selectedAnnotation) {
            const deltaX = currentX - this.dragOffsetX;
            const deltaY = currentY - this.dragOffsetY;
            this.moveAnnotation(this.selectedAnnotation, deltaX, deltaY);
            this.dragOffsetX = currentX;
            this.dragOffsetY = currentY;
            this.render();
            return;
        }
        
        // Manejar redimensionamiento
        if (this.isResizing && this.selectedAnnotation) {
            this.resizeAnnotation(this.selectedAnnotation, currentX, currentY);
            this.render();
            return;
        }
        
        // Cambiar cursor según el contexto
        if (this.selectedAnnotation) {
            const handle = this.getResizeHandle(currentX, currentY);
            if (handle) {
                this.canvas.style.cursor = this.getCursorForHandle(handle);
            } else if (this.isPointInAnnotation(this.selectedAnnotation, currentX, currentY)) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        } else {
            // Mostrar cursor de mano si está sobre una anotación
            const hoveredAnnotation = this.findAnnotationAt(currentX, currentY);
            if (hoveredAnnotation !== null) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
        
        if (!this.isDrawing) return;
        
        if (this.currentTool === 'pencil') {
            const current = this.annotations[this.annotations.length - 1];
            current.points.push({x: currentX, y: currentY});
            this.render();
        } else {
            this.renderPreview(currentX, currentY);
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        this.handleMouseMove(e);
    }

    handleMouseUp(e) {
        // Finalizar arrastre o redimensionamiento
        if (this.isDragging || this.isResizing) {
            this.isDragging = false;
            this.isResizing = false;
            this.resizeHandle = null;
            this.saveHistory();
            return;
        }
        
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        const endX = coords.x;
        const endY = coords.y;
        
        this.isDrawing = false;
        
        const color = document.getElementById('colorPicker').value;
        const width = parseInt(document.getElementById('strokeWidth').value);
        
        if (this.currentTool === 'line') {
            this.annotations.push({
                tool: 'line',
                startX: this.startX,
                startY: this.startY,
                endX: endX,
                endY: endY,
                color: color,
                width: width
            });
        } else if (this.currentTool === 'arrow') {
            this.annotations.push({
                tool: 'arrow',
                startX: this.startX,
                startY: this.startY,
                endX: endX,
                endY: endY,
                color: color,
                width: width
            });
        } else if (this.currentTool === 'curved-arrow') {
            // Calcular punto de control para la curva (perpendicular al centro)
            const midX = (this.startX + endX) / 2;
            const midY = (this.startY + endY) / 2;
            const dx = endX - this.startX;
            const dy = endY - this.startY;
            const offset = Math.sqrt(dx * dx + dy * dy) * 0.2;
            const controlX = midX - dy / Math.sqrt(dx * dx + dy * dy) * offset;
            const controlY = midY + dx / Math.sqrt(dx * dx + dy * dy) * offset;
            
            this.annotations.push({
                tool: 'curved-arrow',
                startX: this.startX,
                startY: this.startY,
                endX: endX,
                endY: endY,
                controlX: controlX,
                controlY: controlY,
                color: color,
                width: width
            });
        } else if (this.currentTool === 'measure-arrow') {
            const measureText = prompt('Ingresa la medida (ej: 5m, 10cm, 3.5ft):', '');
            if (measureText === null || measureText.trim() === '') return; // Usuario canceló o no ingresó nada
            
            this.annotations.push({
                tool: 'measure-arrow',
                startX: this.startX,
                startY: this.startY,
                endX: endX,
                endY: endY,
                measureText: measureText.trim(),
                color: color,
                width: width
            });
        } else if (this.currentTool === 'rectangle') {
            this.annotations.push({
                tool: 'rectangle',
                x: Math.min(this.startX, endX),
                y: Math.min(this.startY, endY),
                width: Math.abs(endX - this.startX),
                height: Math.abs(endY - this.startY),
                color: color,
                strokeWidth: width
            });
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
            this.annotations.push({
                tool: 'circle',
                x: this.startX,
                y: this.startY,
                radius: radius,
                color: color,
                strokeWidth: width
            });
        } else if (this.currentTool === 'ellipse') {
            this.annotations.push({
                tool: 'ellipse',
                x: Math.min(this.startX, endX),
                y: Math.min(this.startY, endY),
                width: Math.abs(endX - this.startX),
                height: Math.abs(endY - this.startY),
                color: color,
                strokeWidth: width
            });
        } else if (this.currentTool === 'triangle') {
            this.annotations.push({
                tool: 'triangle',
                x: Math.min(this.startX, endX),
                y: Math.min(this.startY, endY),
                width: Math.abs(endX - this.startX),
                height: Math.abs(endY - this.startY),
                color: color,
                strokeWidth: width
            });
        } else if (this.currentTool === 'angle') {
            // Crear ángulo de 90 grados por defecto
            const length = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
            this.annotations.push({
                tool: 'angle',
                vertexX: this.startX,
                vertexY: this.startY,
                line1EndX: this.startX + length,
                line1EndY: this.startY,
                line2EndX: this.startX,
                line2EndY: this.startY - length,
                color: color,
                strokeWidth: width
            });
        } else if (this.currentTool === 'polygon') {
            // Forma libre de 4 puntos
            const w = Math.abs(endX - this.startX);
            const h = Math.abs(endY - this.startY);
            const x = Math.min(this.startX, endX);
            const y = Math.min(this.startY, endY);
            
            this.annotations.push({
                tool: 'polygon',
                points: [
                    {x: x, y: y},
                    {x: x + w, y: y},
                    {x: x + w, y: y + h},
                    {x: x, y: y + h}
                ],
                color: color,
                strokeWidth: width
            });
        } else if (this.currentTool === 'highlight') {
            this.annotations.push({
                tool: 'highlight',
                x: Math.min(this.startX, endX),
                y: Math.min(this.startY, endY),
                width: Math.abs(endX - this.startX),
                height: Math.abs(endY - this.startY),
                color: color
            });
        } else if (this.currentTool === 'blur') {
            this.annotations.push({
                tool: 'blur',
                x: Math.min(this.startX, endX),
                y: Math.min(this.startY, endY),
                width: Math.abs(endX - this.startX),
                height: Math.abs(endY - this.startY)
            });
        }
        
        // Guardar historial para todas las herramientas excepto select
        if (this.currentTool !== 'select') {
            this.saveHistory();
        }
        
        this.render();
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const mockEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleMouseUp(mockEvent);
        }
    }
    
    handleDoubleClick(e) {
        const coords = this.getCoordinates(e);
        const clicked = this.findAnnotationAt(coords.x, coords.y);
        
        if (clicked !== null) {
            if (this.annotations[clicked].tool === 'text') {
                this.editText(this.annotations[clicked]);
            } else if (this.annotations[clicked].tool === 'measure-arrow') {
                this.editMeasure(this.annotations[clicked]);
            }
        }
    }

    renderPreview(currentX, currentY) {
        this.render();
        
        const color = document.getElementById('colorPicker').value;
        const width = parseInt(document.getElementById('strokeWidth').value);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        
        if (this.currentTool === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();
        } else if (this.currentTool === 'arrow') {
            this.drawArrow(this.startX, this.startY, currentX, currentY, color, width);
        } else if (this.currentTool === 'curved-arrow') {
            const midX = (this.startX + currentX) / 2;
            const midY = (this.startY + currentY) / 2;
            const dx = currentX - this.startX;
            const dy = currentY - this.startY;
            const offset = Math.sqrt(dx * dx + dy * dy) * 0.2;
            const controlX = midX - dy / Math.sqrt(dx * dx + dy * dy) * offset;
            const controlY = midY + dx / Math.sqrt(dx * dx + dy * dy) * offset;
            this.drawCurvedArrow(this.startX, this.startY, currentX, currentY, controlX, controlY, color, width);
        } else if (this.currentTool === 'measure-arrow') {
            this.drawMeasureArrow(this.startX, this.startY, currentX, currentY, '?', color, width);
        } else if (this.currentTool === 'rectangle') {
            this.ctx.strokeRect(
                Math.min(this.startX, currentX),
                Math.min(this.startY, currentY),
                Math.abs(currentX - this.startX),
                Math.abs(currentY - this.startY)
            );
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(currentX - this.startX, 2) + Math.pow(currentY - this.startY, 2));
            this.ctx.beginPath();
            this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.currentTool === 'ellipse') {
            const rx = Math.abs(currentX - this.startX) / 2;
            const ry = Math.abs(currentY - this.startY) / 2;
            const cx = (this.startX + currentX) / 2;
            const cy = (this.startY + currentY) / 2;
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.currentTool === 'triangle') {
            const x = Math.min(this.startX, currentX);
            const y = Math.min(this.startY, currentY);
            const w = Math.abs(currentX - this.startX);
            const h = Math.abs(currentY - this.startY);
            this.ctx.beginPath();
            this.ctx.moveTo(x + w / 2, y);
            this.ctx.lineTo(x + w, y + h);
            this.ctx.lineTo(x, y + h);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (this.currentTool === 'angle') {
            const length = Math.sqrt(Math.pow(currentX - this.startX, 2) + Math.pow(currentY - this.startY, 2));
            this.ctx.setLineDash([10, 5]); // Líneas punteadas
            
            // Dibujar primera línea (horizontal hacia la derecha)
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(this.startX + length, this.startY);
            this.ctx.stroke();
            
            // Dibujar segunda línea (vertical hacia arriba)
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(this.startX, this.startY - length);
            this.ctx.stroke();
            
            this.ctx.setLineDash([]); // Resetear líneas sólidas
            
            // Mostrar "90°" en el preview
            const arcRadius = 40;
            const textX = this.startX + arcRadius * 0.7;
            const textY = this.startY - arcRadius * 0.7;
            
            this.ctx.font = `bold ${14 + width}px Arial`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('90°', textX, textY);
            
            // Resetear alineación
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
        } else if (this.currentTool === 'polygon') {
            const x = Math.min(this.startX, currentX);
            const y = Math.min(this.startY, currentY);
            const w = Math.abs(currentX - this.startX);
            const h = Math.abs(currentY - this.startY);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + w, y);
            this.ctx.lineTo(x + w, y + h);
            this.ctx.lineTo(x, y + h);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (this.currentTool === 'highlight') {
            this.ctx.fillStyle = color + '40';
            this.ctx.fillRect(
                Math.min(this.startX, currentX),
                Math.min(this.startY, currentY),
                Math.abs(currentX - this.startX),
                Math.abs(currentY - this.startY)
            );
        } else if (this.currentTool === 'blur') {
            this.ctx.strokeStyle = '#999';
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(
                Math.min(this.startX, currentX),
                Math.min(this.startY, currentY),
                Math.abs(currentX - this.startX),
                Math.abs(currentY - this.startY)
            );
            this.ctx.setLineDash([]);
        }
    }

    findAnnotationAt(x, y) {
        // Buscar de atrás hacia adelante (las más recientes primero)
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            if (this.isPointInAnnotation(this.annotations[i], x, y)) {
                return i;
            }
        }
        return null;
    }

    isPointInAnnotation(annotation, x, y) {
        // Tolerancia más grande para facilitar el toque en móviles
        const tolerance = 25;
        
        if (annotation.tool === 'line' || annotation.tool === 'arrow' || annotation.tool === 'measure-arrow') {
            return this.distanceToLine(x, y, annotation.startX, annotation.startY, 
                                       annotation.endX, annotation.endY) < tolerance;
        } else if (annotation.tool === 'curved-arrow') {
            // Para flechas curvas, verificar distancia a múltiples puntos de la curva
            // Usar tolerancia mucho más grande para facilitar la selección
            const curveTolerance = tolerance * 2; // 50px de tolerancia
            const steps = 30; // Más puntos para mejor detección
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const curveX = (1 - t) * (1 - t) * annotation.startX + 
                              2 * (1 - t) * t * annotation.controlX + 
                              t * t * annotation.endX;
                const curveY = (1 - t) * (1 - t) * annotation.startY + 
                              2 * (1 - t) * t * annotation.controlY + 
                              t * t * annotation.endY;
                
                const dist = Math.sqrt(Math.pow(x - curveX, 2) + Math.pow(y - curveY, 2));
                if (dist < curveTolerance) {
                    return true;
                }
            }
            return false;
        } else if (annotation.tool === 'rectangle' || annotation.tool === 'highlight' || 
                   annotation.tool === 'blur') {
            // Expandir el área de detección con tolerancia
            return x >= annotation.x - tolerance && x <= annotation.x + annotation.width + tolerance &&
                   y >= annotation.y - tolerance && y <= annotation.y + annotation.height + tolerance;
        } else if (annotation.tool === 'circle') {
            const dist = Math.sqrt(Math.pow(x - annotation.x, 2) + Math.pow(y - annotation.y, 2));
            return Math.abs(dist - annotation.radius) < tolerance;
        } else if (annotation.tool === 'ellipse' || annotation.tool === 'triangle') {
            // Expandir el área de detección con tolerancia
            return x >= annotation.x - tolerance && x <= annotation.x + annotation.width + tolerance &&
                   y >= annotation.y - tolerance && y <= annotation.y + annotation.height + tolerance;
        } else if (annotation.tool === 'angle') {
            // Verificar si está cerca de alguna de las dos líneas del ángulo
            // Usar tolerancia más grande para facilitar la selección
            const angleTolerance = tolerance * 1.5; // 37.5px de tolerancia
            const onLine1 = this.distanceToLine(x, y, annotation.vertexX, annotation.vertexY, 
                                                annotation.line1EndX, annotation.line1EndY) < angleTolerance;
            const onLine2 = this.distanceToLine(x, y, annotation.vertexX, annotation.vertexY, 
                                                annotation.line2EndX, annotation.line2EndY) < angleTolerance;
            return onLine1 || onLine2;
        } else if (annotation.tool === 'polygon') {
            // Verificar si el punto está cerca de algún borde del polígono
            const points = annotation.points;
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                if (this.distanceToLine(x, y, p1.x, p1.y, p2.x, p2.y) < tolerance) {
                    return true;
                }
            }
            
            // También verificar si está dentro del polígono
            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i].x, yi = points[i].y;
                const xj = points[j].x, yj = points[j].y;
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        } else if (annotation.tool === 'pencil') {
            for (let i = 0; i < annotation.points.length - 1; i++) {
                const p1 = annotation.points[i];
                const p2 = annotation.points[i + 1];
                if (this.distanceToLine(x, y, p1.x, p1.y, p2.x, p2.y) < tolerance) {
                    return true;
                }
            }
            return false;
        } else if (annotation.tool === 'text') {
            const textWidth = this.ctx.measureText(annotation.text).width;
            // Expandir el área de detección con tolerancia
            return x >= annotation.x - tolerance && x <= annotation.x + textWidth + tolerance &&
                   y >= annotation.y - annotation.fontSize - tolerance && y <= annotation.y + tolerance;
        }
        return false;
    }

    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getResizeHandle(x, y) {
        if (!this.selectedAnnotation) return null;
        
        // Área más grande para facilitar el toque en móviles
        const handleSize = 30;
        const annotation = this.selectedAnnotation;
        
        if (annotation.tool === 'rectangle' || annotation.tool === 'highlight' || 
            annotation.tool === 'blur' || annotation.tool === 'ellipse' || annotation.tool === 'triangle') {
            const handles = [
                {name: 'nw', x: annotation.x, y: annotation.y},
                {name: 'ne', x: annotation.x + annotation.width, y: annotation.y},
                {name: 'sw', x: annotation.x, y: annotation.y + annotation.height},
                {name: 'se', x: annotation.x + annotation.width, y: annotation.y + annotation.height}
            ];
            
            for (const handle of handles) {
                if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
                    return handle.name;
                }
            }
        } else if (annotation.tool === 'polygon') {
            // Handles en cada punto del polígono
            for (let i = 0; i < annotation.points.length; i++) {
                const point = annotation.points[i];
                if (Math.abs(x - point.x) < handleSize && Math.abs(y - point.y) < handleSize) {
                    return 'point' + i;
                }
            }
        } else if (annotation.tool === 'line' || annotation.tool === 'arrow' || 
                   annotation.tool === 'measure-arrow') {
            if (Math.abs(x - annotation.startX) < handleSize && Math.abs(y - annotation.startY) < handleSize) {
                return 'start';
            }
            if (Math.abs(x - annotation.endX) < handleSize && Math.abs(y - annotation.endY) < handleSize) {
                return 'end';
            }
        } else if (annotation.tool === 'curved-arrow') {
            // Handles para inicio, fin y punto de control con áreas muy grandes
            // Verificar punto de control primero (tiene prioridad)
            const controlDist = Math.sqrt(Math.pow(x - annotation.controlX, 2) + Math.pow(y - annotation.controlY, 2));
            if (controlDist < handleSize * 3) { // Área de detección 3 veces más grande (90px)
                return 'control';
            }
            // Áreas más grandes para inicio y fin también
            if (Math.abs(x - annotation.startX) < handleSize * 2 && Math.abs(y - annotation.startY) < handleSize * 2) {
                return 'start';
            }
            if (Math.abs(x - annotation.endX) < handleSize * 2 && Math.abs(y - annotation.endY) < handleSize * 2) {
                return 'end';
            }
        } else if (annotation.tool === 'angle') {
            // Handles en el vértice y los extremos de las dos líneas
            if (Math.abs(x - annotation.vertexX) < handleSize && Math.abs(y - annotation.vertexY) < handleSize) {
                return 'vertex';
            }
            if (Math.abs(x - annotation.line1EndX) < handleSize && Math.abs(y - annotation.line1EndY) < handleSize) {
                return 'line1End';
            }
            if (Math.abs(x - annotation.line2EndX) < handleSize && Math.abs(y - annotation.line2EndY) < handleSize) {
                return 'line2End';
            }
        } else if (annotation.tool === 'circle') {
            const edgeX = annotation.x + annotation.radius;
            const edgeY = annotation.y;
            if (Math.abs(x - edgeX) < handleSize && Math.abs(y - edgeY) < handleSize) {
                return 'radius';
            }
        } else if (annotation.tool === 'text') {
            // Calcular ancho del texto
            this.ctx.font = `${annotation.fontSize}px Arial`;
            const textWidth = this.ctx.measureText(annotation.text).width;
            const textX = annotation.x;
            const textY = annotation.y - annotation.fontSize;
            
            // Handle para cambiar tamaño de fuente (esquina inferior derecha)
            if (Math.abs(x - (textX + textWidth)) < handleSize && Math.abs(y - annotation.y) < handleSize) {
                return 'fontSize';
            }
        }
        
        return null;
    }

    getCursorForHandle(handle) {
        const cursors = {
            'nw': 'nw-resize',
            'ne': 'ne-resize',
            'sw': 'sw-resize',
            'se': 'se-resize',
            'start': 'move',
            'end': 'move',
            'radius': 'ew-resize',
            'control': 'move',
            'fontSize': 'ns-resize'
        };
        return cursors[handle] || 'default';
    }

    moveAnnotation(annotation, deltaX, deltaY) {
        if (annotation.tool === 'line' || annotation.tool === 'arrow' || 
            annotation.tool === 'curved-arrow' || annotation.tool === 'measure-arrow') {
            annotation.startX += deltaX;
            annotation.startY += deltaY;
            annotation.endX += deltaX;
            annotation.endY += deltaY;
            if (annotation.controlX !== undefined) {
                annotation.controlX += deltaX;
                annotation.controlY += deltaY;
            }
        } else if (annotation.tool === 'rectangle' || annotation.tool === 'highlight' || 
                   annotation.tool === 'blur' || annotation.tool === 'ellipse' || annotation.tool === 'triangle') {
            annotation.x += deltaX;
            annotation.y += deltaY;
        } else if (annotation.tool === 'polygon') {
            annotation.points.forEach(point => {
                point.x += deltaX;
                point.y += deltaY;
            });
        } else if (annotation.tool === 'angle') {
            annotation.vertexX += deltaX;
            annotation.vertexY += deltaY;
            annotation.line1EndX += deltaX;
            annotation.line1EndY += deltaY;
            annotation.line2EndX += deltaX;
            annotation.line2EndY += deltaY;
        } else if (annotation.tool === 'circle') {
            annotation.x += deltaX;
            annotation.y += deltaY;
        } else if (annotation.tool === 'pencil') {
            annotation.points.forEach(point => {
                point.x += deltaX;
                point.y += deltaY;
            });
        } else if (annotation.tool === 'text') {
            annotation.x += deltaX;
            annotation.y += deltaY;
        }
    }

    resizeAnnotation(annotation, x, y) {
        if (annotation.tool === 'rectangle' || annotation.tool === 'highlight' || 
            annotation.tool === 'blur' || annotation.tool === 'ellipse' || annotation.tool === 'triangle') {
            if (this.resizeHandle === 'se') {
                annotation.width = x - annotation.x;
                annotation.height = y - annotation.y;
            } else if (this.resizeHandle === 'nw') {
                const newWidth = annotation.width + (annotation.x - x);
                const newHeight = annotation.height + (annotation.y - y);
                annotation.x = x;
                annotation.y = y;
                annotation.width = newWidth;
                annotation.height = newHeight;
            } else if (this.resizeHandle === 'ne') {
                const newHeight = annotation.height + (annotation.y - y);
                annotation.y = y;
                annotation.width = x - annotation.x;
                annotation.height = newHeight;
            } else if (this.resizeHandle === 'sw') {
                const newWidth = annotation.width + (annotation.x - x);
                annotation.x = x;
                annotation.width = newWidth;
                annotation.height = y - annotation.y;
            }
        } else if (annotation.tool === 'line' || annotation.tool === 'arrow' || annotation.tool === 'measure-arrow') {
            if (this.resizeHandle === 'start') {
                annotation.startX = x;
                annotation.startY = y;
            } else if (this.resizeHandle === 'end') {
                annotation.endX = x;
                annotation.endY = y;
            }
        } else if (annotation.tool === 'curved-arrow') {
            if (this.resizeHandle === 'start') {
                annotation.startX = x;
                annotation.startY = y;
            } else if (this.resizeHandle === 'end') {
                annotation.endX = x;
                annotation.endY = y;
            } else if (this.resizeHandle === 'control') {
                // Permitir mover libremente el punto de control
                annotation.controlX = x;
                annotation.controlY = y;
            }
        } else if (annotation.tool === 'angle') {
            if (this.resizeHandle === 'vertex') {
                // Mover el vértice
                annotation.vertexX = x;
                annotation.vertexY = y;
            } else if (this.resizeHandle === 'line1End') {
                // Mover el extremo de la primera línea
                annotation.line1EndX = x;
                annotation.line1EndY = y;
            } else if (this.resizeHandle === 'line2End') {
                // Mover el extremo de la segunda línea
                annotation.line2EndX = x;
                annotation.line2EndY = y;
            }
        } else if (annotation.tool === 'circle') {
            const newRadius = Math.sqrt(Math.pow(x - annotation.x, 2) + Math.pow(y - annotation.y, 2));
            annotation.radius = newRadius;
        } else if (annotation.tool === 'polygon') {
            // Mover el punto específico del polígono
            const pointIndex = parseInt(this.resizeHandle.replace('point', ''));
            if (!isNaN(pointIndex) && annotation.points[pointIndex]) {
                annotation.points[pointIndex].x = x;
                annotation.points[pointIndex].y = y;
            }
        } else if (annotation.tool === 'text' && this.resizeHandle === 'fontSize') {
            // Cambiar tamaño de fuente basado en la distancia
            const distance = Math.abs(y - annotation.y);
            const newFontSize = Math.max(12, Math.min(72, Math.round(distance)));
            annotation.fontSize = newFontSize;
            annotation.height = newFontSize;
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.image) {
            // Dibujar la imagen (ya está en el tamaño correcto)
            this.ctx.drawImage(this.image, 0, 0);
        }
        
        this.annotations.forEach(annotation => {
            if (annotation.tool === 'pencil') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.width;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.beginPath();
                annotation.points.forEach((point, index) => {
                    if (index === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                });
                this.ctx.stroke();
            } else if (annotation.tool === 'line') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.width;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(annotation.startX, annotation.startY);
                this.ctx.lineTo(annotation.endX, annotation.endY);
                this.ctx.stroke();
            } else if (annotation.tool === 'arrow') {
                this.drawArrow(
                    annotation.startX,
                    annotation.startY,
                    annotation.endX,
                    annotation.endY,
                    annotation.color,
                    annotation.width
                );
            } else if (annotation.tool === 'curved-arrow') {
                this.drawCurvedArrow(
                    annotation.startX,
                    annotation.startY,
                    annotation.endX,
                    annotation.endY,
                    annotation.controlX,
                    annotation.controlY,
                    annotation.color,
                    annotation.width
                );
            } else if (annotation.tool === 'measure-arrow') {
                this.drawMeasureArrow(
                    annotation.startX,
                    annotation.startY,
                    annotation.endX,
                    annotation.endY,
                    annotation.measureText,
                    annotation.color,
                    annotation.width
                );
            } else if (annotation.tool === 'rectangle') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.strokeWidth;
                this.ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
            } else if (annotation.tool === 'circle') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.strokeWidth;
                this.ctx.beginPath();
                this.ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (annotation.tool === 'ellipse') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.strokeWidth;
                const rx = annotation.width / 2;
                const ry = annotation.height / 2;
                const cx = annotation.x + rx;
                const cy = annotation.y + ry;
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (annotation.tool === 'triangle') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.strokeWidth;
                this.ctx.beginPath();
                this.ctx.moveTo(annotation.x + annotation.width / 2, annotation.y);
                this.ctx.lineTo(annotation.x + annotation.width, annotation.y + annotation.height);
                this.ctx.lineTo(annotation.x, annotation.y + annotation.height);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (annotation.tool === 'angle') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.setLineDash([10, 5]); // Líneas punteadas
                
                // Dibujar primera línea
                this.ctx.beginPath();
                this.ctx.moveTo(annotation.vertexX, annotation.vertexY);
                this.ctx.lineTo(annotation.line1EndX, annotation.line1EndY);
                this.ctx.stroke();
                
                // Dibujar segunda línea
                this.ctx.beginPath();
                this.ctx.moveTo(annotation.vertexX, annotation.vertexY);
                this.ctx.lineTo(annotation.line2EndX, annotation.line2EndY);
                this.ctx.stroke();
                
                this.ctx.setLineDash([]); // Resetear líneas sólidas
                
                // Calcular el ángulo en grados
                const dx1 = annotation.line1EndX - annotation.vertexX;
                const dy1 = annotation.line1EndY - annotation.vertexY;
                const dx2 = annotation.line2EndX - annotation.vertexX;
                const dy2 = annotation.line2EndY - annotation.vertexY;
                
                const angle1 = Math.atan2(dy1, dx1);
                const angle2 = Math.atan2(dy2, dx2);
                let angleDiff = (angle2 - angle1) * (180 / Math.PI);
                
                // Normalizar el ángulo entre 0 y 360
                if (angleDiff < 0) angleDiff += 360;
                if (angleDiff > 180) angleDiff = 360 - angleDiff;
                
                const angleText = Math.round(angleDiff) + '°';
                
                // Dibujar el texto del ángulo
                const arcRadius = 40;
                const midAngle = (angle1 + angle2) / 2;
                const textX = annotation.vertexX + Math.cos(midAngle) * arcRadius;
                const textY = annotation.vertexY + Math.sin(midAngle) * arcRadius;
                
                this.ctx.font = `bold ${14 + annotation.strokeWidth}px Arial`;
                const textMetrics = this.ctx.measureText(angleText);
                const textWidth = textMetrics.width;
                const textHeight = 14 + annotation.strokeWidth;
                const padding = 4;
                
                // Fondo para el texto
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.ctx.fillRect(
                    textX - textWidth / 2 - padding,
                    textY - textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
                
                // Borde del fondo
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    textX - textWidth / 2 - padding,
                    textY - textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
                
                // Texto del ángulo
                this.ctx.fillStyle = annotation.color;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(angleText, textX, textY);
                
                // Resetear alineación
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'alphabetic';
            } else if (annotation.tool === 'polygon') {
                this.ctx.strokeStyle = annotation.color;
                this.ctx.lineWidth = annotation.strokeWidth;
                this.ctx.beginPath();
                annotation.points.forEach((point, index) => {
                    if (index === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                });
                this.ctx.closePath();
                this.ctx.stroke();
                
                // Dibujar handles siempre visibles para polígonos (más grandes para móvil)
                const handleSize = 16;
                this.ctx.fillStyle = annotation.color;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                annotation.points.forEach(point => {
                    this.ctx.fillRect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
                    this.ctx.strokeRect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
                });
            } else if (annotation.tool === 'highlight') {
                this.ctx.fillStyle = annotation.color + '40';
                this.ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
            } else if (annotation.tool === 'blur') {
                this.applyBlur(annotation.x, annotation.y, annotation.width, annotation.height);
            } else if (annotation.tool === 'text') {
                this.ctx.fillStyle = annotation.color;
                this.ctx.font = `${annotation.fontSize}px Arial`;
                this.ctx.fillText(annotation.text, annotation.x, annotation.y);
            }
        });
        
        // Dibujar handles de selección
        if (this.selectedAnnotation) {
            this.drawSelectionHandles(this.selectedAnnotation);
        }
    }

    drawSelectionHandles(annotation) {
        // Mostrar botón de eliminar
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        
        // Mostrar botón de editar solo si es texto o flecha con medida
        const editTextBtn = document.getElementById('editTextBtn');
        if (editTextBtn) {
            if (annotation.tool === 'text' || annotation.tool === 'measure-arrow') {
                editTextBtn.style.display = 'inline-block';
            } else {
                editTextBtn.style.display = 'none';
            }
        }
        
        // Handles más grandes para facilitar el toque en móviles
        const handleSize = 16;
        this.ctx.fillStyle = '#667eea';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        
        const drawHandle = (x, y) => {
            this.ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
            this.ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        };
        
        if (annotation.tool === 'rectangle' || annotation.tool === 'highlight' || 
            annotation.tool === 'blur' || annotation.tool === 'ellipse' || annotation.tool === 'triangle') {
            // Dibujar borde de selección
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
            this.ctx.setLineDash([]);
            
            // Handles en las esquinas
            drawHandle(annotation.x, annotation.y);
            drawHandle(annotation.x + annotation.width, annotation.y);
            drawHandle(annotation.x, annotation.y + annotation.height);
            drawHandle(annotation.x + annotation.width, annotation.y + annotation.height);
        } else if (annotation.tool === 'polygon') {
            // Dibujar borde de selección
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            annotation.points.forEach((point, index) => {
                if (index === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    this.ctx.lineTo(point.x, point.y);
                }
            });
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Handles en cada punto
            annotation.points.forEach(point => {
                drawHandle(point.x, point.y);
            });
        } else if (annotation.tool === 'line' || annotation.tool === 'arrow' || annotation.tool === 'measure-arrow') {
            // Handles en inicio y fin
            drawHandle(annotation.startX, annotation.startY);
            drawHandle(annotation.endX, annotation.endY);
        } else if (annotation.tool === 'angle') {
            // Dibujar líneas de selección
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(annotation.vertexX, annotation.vertexY);
            this.ctx.lineTo(annotation.line1EndX, annotation.line1EndY);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(annotation.vertexX, annotation.vertexY);
            this.ctx.lineTo(annotation.line2EndX, annotation.line2EndY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Handles en vértice y extremos
            drawHandle(annotation.vertexX, annotation.vertexY);
            drawHandle(annotation.line1EndX, annotation.line1EndY);
            drawHandle(annotation.line2EndX, annotation.line2EndY);
        } else if (annotation.tool === 'curved-arrow') {
            // Dibujar líneas guía hacia el punto de control
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.moveTo(annotation.startX, annotation.startY);
            this.ctx.lineTo(annotation.controlX, annotation.controlY);
            this.ctx.lineTo(annotation.endX, annotation.endY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Handles en inicio, fin y punto de control
            drawHandle(annotation.startX, annotation.startY);
            drawHandle(annotation.endX, annotation.endY);
            
            // Handle del punto de control (diferente color para distinguirlo)
            this.ctx.fillStyle = '#f59e0b'; // Color naranja para el punto de control
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 5;
            this.ctx.beginPath();
            this.ctx.arc(annotation.controlX, annotation.controlY, handleSize * 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (annotation.tool === 'circle') {
            // Dibujar borde de selección
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Handle en el borde
            drawHandle(annotation.x + annotation.radius, annotation.y);
        } else if (annotation.tool === 'pencil') {
            // Dibujar puntos de inicio y fin
            if (annotation.points.length > 0) {
                const first = annotation.points[0];
                const last = annotation.points[annotation.points.length - 1];
                drawHandle(first.x, first.y);
                drawHandle(last.x, last.y);
            }
        } else if (annotation.tool === 'text') {
            this.ctx.font = `${annotation.fontSize}px Arial`;
            const textWidth = this.ctx.measureText(annotation.text).width;
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(annotation.x, annotation.y - annotation.fontSize, 
                              textWidth, annotation.fontSize);
            this.ctx.setLineDash([]);
            
            // Handle para mover (esquina superior izquierda)
            drawHandle(annotation.x, annotation.y - annotation.fontSize);
            // Handle para cambiar tamaño (esquina inferior derecha)
            drawHandle(annotation.x + textWidth, annotation.y);
        }
    }

    drawArrow(fromX, fromY, toX, toY, color, width) {
        const headLength = 25 + width * 2; // Aumentado de 15 + width * 1.5
        const headWidth = 12 + width * 1.5; // Aumentado de 8 + width
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Calcular el punto donde termina la línea (base del triángulo)
        const arrowBaseX = toX - (headLength * 0.6) * Math.cos(angle);
        const arrowBaseY = toY - (headLength * 0.6) * Math.sin(angle);
        
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'butt';
        this.ctx.lineJoin = 'miter';
        
        // Dibujar la línea hasta la base del triángulo
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(arrowBaseX, arrowBaseY);
        this.ctx.stroke();
        
        // Dibujar el triángulo de la punta (más ancho)
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6), // Ángulo más abierto (PI/6 en lugar de PI/7)
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawCurvedArrow(fromX, fromY, toX, toY, controlX, controlY, color, width) {
        const headLength = 25 + width * 2; // Aumentado para consistencia
        
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Calcular el ángulo de la flecha en el punto final
        const t = 0.95; // Punto cerca del final para calcular la tangente
        const x1 = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * controlX + t * t * toX;
        const y1 = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * controlY + t * t * toY;
        const angle = Math.atan2(toY - y1, toX - x1);
        
        // Calcular el punto donde termina la curva (base del triángulo)
        const arrowBaseX = toX - (headLength * 0.6) * Math.cos(angle);
        const arrowBaseY = toY - (headLength * 0.6) * Math.sin(angle);
        
        // Encontrar el valor t en la curva que corresponde al punto base
        // Usamos un valor aproximado basado en la proporción de distancia
        const totalDist = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const baseDist = Math.sqrt(Math.pow(arrowBaseX - fromX, 2) + Math.pow(arrowBaseY - fromY, 2));
        const tEnd = Math.min(0.95, baseDist / totalDist);
        
        // Calcular el punto final de la curva
        const curveEndX = (1 - tEnd) * (1 - tEnd) * fromX + 2 * (1 - tEnd) * tEnd * controlX + tEnd * tEnd * toX;
        const curveEndY = (1 - tEnd) * (1 - tEnd) * fromY + 2 * (1 - tEnd) * tEnd * controlY + tEnd * tEnd * toY;
        
        // Dibujar la curva hasta la base del triángulo
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.quadraticCurveTo(controlX, controlY, curveEndX, curveEndY);
        this.ctx.stroke();
        
        // Dibujar la punta de la flecha (más ancha)
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6), // Ángulo más abierto
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawMeasureArrow(fromX, fromY, toX, toY, measureText, color, width) {
        const headLength = 25 + width * 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Calcular puntos base para ambas puntas
        const arrowBaseStartX = fromX + (headLength * 0.6) * Math.cos(angle);
        const arrowBaseStartY = fromY + (headLength * 0.6) * Math.sin(angle);
        const arrowBaseEndX = toX - (headLength * 0.6) * Math.cos(angle);
        const arrowBaseEndY = toY - (headLength * 0.6) * Math.sin(angle);
        
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'butt';
        this.ctx.lineJoin = 'miter';
        
        // Dibujar la línea punteada entre las dos puntas
        this.ctx.setLineDash([10, 5]); // Línea punteada
        this.ctx.beginPath();
        this.ctx.moveTo(arrowBaseStartX, arrowBaseStartY);
        this.ctx.lineTo(arrowBaseEndX, arrowBaseEndY);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Resetear a línea sólida
        
        // Dibujar punta al inicio (apuntando hacia atrás)
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(
            fromX + headLength * Math.cos(angle - Math.PI / 6),
            fromY + headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            fromX + headLength * Math.cos(angle + Math.PI / 6),
            fromY + headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // Dibujar punta al final (apuntando hacia adelante)
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // Dibujar la medida en el centro
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        
        // Fondo para el texto con medida personalizada
        this.ctx.font = `bold ${14 + width}px Arial`;
        const textMetrics = this.ctx.measureText(measureText);
        const textWidth = textMetrics.width;
        const textHeight = 14 + width;
        const padding = 6;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(
            midX - textWidth / 2 - padding,
            midY - textHeight / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
        
        // Borde del fondo
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            midX - textWidth / 2 - padding,
            midY - textHeight / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
        
        // Texto de la medida
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(measureText, midX, midY);
        
        // Resetear alineación
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
    }

    applyBlur(x, y, width, height) {
        if (!this.image) return;
        
        const imageData = this.ctx.getImageData(x, y, width, height);
        const blurred = this.gaussianBlur(imageData, 10);
        this.ctx.putImageData(blurred, x, y);
    }

    gaussianBlur(imageData, radius) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        for (let i = 0; i < radius; i++) {
            this.boxBlur(pixels, width, height);
        }
        
        return imageData;
    }

    boxBlur(pixels, width, height) {
        const tempPixels = new Uint8ClampedArray(pixels);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            r += tempPixels[idx];
                            g += tempPixels[idx + 1];
                            b += tempPixels[idx + 2];
                            count++;
                        }
                    }
                }
                
                const idx = (y * width + x) * 4;
                pixels[idx] = r / count;
                pixels[idx + 1] = g / count;
                pixels[idx + 2] = b / count;
            }
        }
    }

    addText() {
        const text = prompt('Ingresa el texto:');
        if (!text) return;
        
        const fontSizeInput = prompt('Tamaño de fuente (12-72):', '50');
        if (!fontSizeInput) return;
        
        const fontSize = Math.max(12, Math.min(72, parseInt(fontSizeInput) || 50));
        
        this.annotations.push({
            tool: 'text',
            text: text,
            x: this.startX,
            y: this.startY + fontSize, // Ajustar para que el texto esté sobre el punto de clic
            color: document.getElementById('colorPicker').value,
            fontSize: fontSize,
            width: 0, // Se calculará al renderizar
            height: fontSize
        });
        
        this.saveHistory();
        this.render();
    }
    
    editText(annotation) {
        const newText = prompt('Editar texto:', annotation.text);
        if (newText === null) return; // Usuario canceló
        
        if (newText !== '') {
            annotation.text = newText;
        }
        
        const fontSizeInput = prompt('Tamaño de fuente (12-72):', annotation.fontSize.toString());
        if (fontSizeInput !== null && fontSizeInput !== '') {
            const newFontSize = Math.max(12, Math.min(72, parseInt(fontSizeInput) || annotation.fontSize));
            annotation.fontSize = newFontSize;
            annotation.height = newFontSize;
        }
        
        this.saveHistory();
        this.render();
    }
    
    editMeasure(annotation) {
        const newMeasure = prompt('Editar medida (ej: 5m, 10cm, 3.5ft):', annotation.measureText);
        if (newMeasure === null) return; // Usuario canceló
        
        if (newMeasure.trim() !== '') {
            annotation.measureText = newMeasure.trim();
        }
        
        this.saveHistory();
        this.render();
    }
    
    editSelectedText() {
        if (this.selectedAnnotation) {
            if (this.selectedAnnotation.tool === 'text') {
                this.editText(this.selectedAnnotation);
            } else if (this.selectedAnnotation.tool === 'measure-arrow') {
                this.editMeasure(this.selectedAnnotation);
            }
        }
    }
    
    hideEditButtons() {
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        const editTextBtn = document.getElementById('editTextBtn');
        if (editTextBtn) editTextBtn.style.display = 'none';
    }

    updateStrokeWidthControl() {
        if (!this.selectedAnnotation) return;
        
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeValueSpan = document.getElementById('strokeValue');
        
        let currentWidth = null;
        
        // Obtener el grosor actual de la anotación seleccionada
        if (this.selectedAnnotation.strokeWidth !== undefined) {
            currentWidth = this.selectedAnnotation.strokeWidth;
        } else if (this.selectedAnnotation.width !== undefined && 
                  (this.selectedAnnotation.tool === 'pencil' || 
                   this.selectedAnnotation.tool === 'line' || 
                   this.selectedAnnotation.tool === 'arrow' || 
                   this.selectedAnnotation.tool === 'curved-arrow' || 
                   this.selectedAnnotation.tool === 'measure-arrow')) {
            currentWidth = this.selectedAnnotation.width;
        }
        
        // Actualizar el control si se encontró un grosor
        if (currentWidth !== null && strokeWidthInput && strokeValueSpan) {
            strokeWidthInput.value = currentWidth;
            strokeValueSpan.textContent = currentWidth;
        }
    }

    saveHistory() {
        this.historyStep++;
        this.history = this.history.slice(0, this.historyStep);
        this.history.push(JSON.parse(JSON.stringify(this.annotations)));
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.annotations = JSON.parse(JSON.stringify(this.history[this.historyStep]));
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            
            // Ocultar botones de edición
            this.hideEditButtons();
            
            this.render();
        } else if (this.historyStep === 0) {
            this.historyStep = -1;
            this.annotations = [];
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            
            // Ocultar botones de edición
            this.hideEditButtons();
            
            this.render();
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.annotations = JSON.parse(JSON.stringify(this.history[this.historyStep]));
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            
            // Ocultar botones de edición
            this.hideEditButtons();
            
            this.render();
        }
    }

    deleteSelectedAnnotation() {
        if (this.selectedAnnotationIndex !== -1) {
            this.annotations.splice(this.selectedAnnotationIndex, 1);
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            
            // Ocultar botones de edición
            this.hideEditButtons();
            
            this.saveHistory();
            this.render();
        }
    }

    clearAnnotations() {
        if (confirm('¿Estás seguro de que quieres eliminar todas las anotaciones?')) {
            this.annotations = [];
            this.history = [];
            this.historyStep = -1;
            this.selectedAnnotation = null;
            this.selectedAnnotationIndex = -1;
            this.hideEditButtons();
            this.render();
        }
    }

    exportImage() {
        const link = document.createElement('a');
        link.download = 'abdedit-' + Date.now() + '.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
}

const app = new AbdEditApp();
