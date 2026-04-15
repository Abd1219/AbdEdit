import { DrawingUtils } from './DrawingUtils.js';

export class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        
        // Temp canvas for blur effect
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
    }

    setImage(img) {
        this.image = img;
        this.setSize(img.width, img.height);
        
        // Preparation for blur
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        this.tempCtx.drawImage(img, 0, 0);
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

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render(image, annotations, selectedAnnotation) {
        this.clear();
        
        if (image) {
            this.ctx.drawImage(image, 0, 0);
        }
        
        annotations.forEach(annotation => {
            this.drawAnnotation(annotation);
        });
        
        if (selectedAnnotation) {
            this.drawSelectionHandles(selectedAnnotation);
        }
    }

    drawAnnotation(ann) {
        const { ctx } = this;
        ctx.save();
        
        if (ann.tool === 'pencil') {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ann.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();
        } else if (ann.tool === 'line') {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ann.startX, ann.startY);
            ctx.lineTo(ann.endX, ann.endY);
            ctx.stroke();
        } else if (ann.tool === 'arrow') {
            DrawingUtils.drawArrow(ctx, ann.startX, ann.startY, ann.endX, ann.endY, ann.color, ann.width);
        } else if (ann.tool === 'curved-arrow') {
            DrawingUtils.drawCurvedArrow(ctx, ann.startX, ann.startY, ann.endX, ann.endY, ann.controlX, ann.controlY, ann.color, ann.width);
        } else if (ann.tool === 'measure-arrow') {
            DrawingUtils.drawMeasureArrow(ctx, ann.startX, ann.startY, ann.endX, ann.endY, ann.measureText, ann.color, ann.width);
        } else if (ann.tool === 'rectangle') {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        } else if (ann.tool === 'circle') {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            ctx.beginPath();
            ctx.arc(ann.x, ann.y, ann.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (ann.tool === 'ellipse') {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            const rx = ann.width / 2, ry = ann.height / 2;
            const cx = ann.x + rx, cy = ann.y + ry;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (ann.tool === 'triangle') {
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.strokeWidth;
            ctx.beginPath();
            ctx.moveTo(ann.x + ann.width / 2, ann.y);
            ctx.lineTo(ann.x + ann.width, ann.y + ann.height);
            ctx.lineTo(ann.x, ann.y + ann.height);
            ctx.closePath();
            ctx.stroke();
        } else if (ann.tool === 'angle') {
            this.drawAngle(ann);
        } else if (ann.tool === 'polygon') {
            this.drawPolygon(ann);
        } else if (ann.tool === 'highlight') {
            ctx.fillStyle = ann.color + '40';
            ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        } else if (ann.tool === 'blur') {
            DrawingUtils.applyBlur(ctx, ann.x, ann.y, ann.width, ann.height, this.tempCanvas);
        } else if (ann.tool === 'text') {
            ctx.fillStyle = ann.color;
            ctx.font = `${ann.fontSize}px Arial`;
            ctx.fillText(ann.text, ann.x, ann.y);
        }
        
        ctx.restore();
    }

    drawAngle(ann) {
        const { ctx } = this;
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(ann.vertexX, ann.vertexY);
        ctx.lineTo(ann.line1EndX, ann.line1EndY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ann.vertexX, ann.vertexY);
        ctx.lineTo(ann.line2EndX, ann.line2EndY);
        ctx.stroke();
        ctx.setLineDash([]);

        const dx1 = ann.line1EndX - ann.vertexX, dy1 = ann.line1EndY - ann.vertexY;
        const dx2 = ann.line2EndX - ann.vertexX, dy2 = ann.line2EndY - ann.vertexY;
        const angle1 = Math.atan2(dy1, dx1), angle2 = Math.atan2(dy2, dx2);
        let diff = (angle2 - angle1) * (180 / Math.PI);
        if (diff < 0) diff += 360;
        if (diff > 180) diff = 360 - diff;
        
        const text = Math.round(diff) + '°';
        const midAngle = (angle1 + angle2) / 2;
        const radius = 40;
        const tx = ann.vertexX + Math.cos(midAngle) * radius;
        const ty = ann.vertexY + Math.sin(midAngle) * radius;
        
        ctx.font = `bold ${14 + ann.strokeWidth}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(text);
        const tw = metrics.width, th = 14 + ann.strokeWidth, p = 4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(tx - tw / 2 - p, ty - th / 2 - p, tw + p * 2, th + p * 2);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - tw / 2 - p, ty - th / 2 - p, tw + p * 2, th + p * 2);
        
        ctx.fillStyle = ann.color;
        ctx.fillText(text, tx, ty);
    }

    drawPolygon(ann) {
        const { ctx } = this;
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.beginPath();
        ann.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();
        
        // Handles for polygon points
        const hs = 16;
        ctx.fillStyle = ann.color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ann.points.forEach(p => {
            ctx.fillRect(p.x - hs / 2, p.y - hs / 2, hs, hs);
            ctx.strokeRect(p.x - hs / 2, p.y - hs / 2, hs, hs);
        });
    }

    drawSelectionHandles(ann) {
        const { ctx } = this;
        const hs = 16;
        ctx.save();
        ctx.fillStyle = '#667eea';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        const drawH = (x, y) => {
            ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs);
            ctx.strokeRect(x - hs / 2, y - hs / 2, hs, hs);
        };

        if (['rectangle', 'highlight', 'blur', 'ellipse', 'triangle'].includes(ann.tool)) {
            ctx.strokeStyle = '#667eea';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
            ctx.setLineDash([]);
            drawH(ann.x, ann.y);
            drawH(ann.x + ann.width, ann.y);
            drawH(ann.x, ann.y + ann.height);
            drawH(ann.x + ann.width, ann.y + ann.height);
        } else if (ann.tool === 'polygon') {
            ctx.strokeStyle = '#667eea';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ann.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
            ann.points.forEach(p => drawH(p.x, p.y));
        } else if (['line', 'arrow', 'measure-arrow'].includes(ann.tool)) {
            drawH(ann.startX, ann.startY);
            drawH(ann.endX, ann.endY);
        } else if (ann.tool === 'angle') {
            drawH(ann.vertexX, ann.vertexY);
            drawH(ann.line1EndX, ann.line1EndY);
            drawH(ann.line2EndX, ann.line2EndY);
        } else if (ann.tool === 'curved-arrow') {
            ctx.strokeStyle = '#667eea';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(ann.startX, ann.startY);
            ctx.lineTo(ann.controlX, ann.controlY);
            ctx.lineTo(ann.endX, ann.endY);
            ctx.stroke();
            ctx.setLineDash([]);
            drawH(ann.startX, ann.startY);
            drawH(ann.endX, ann.endY);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(ann.controlX, ann.controlY, hs, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (ann.tool === 'circle') {
            drawH(ann.x + ann.radius, ann.y);
        } else if (ann.tool === 'text') {
            ctx.font = `${ann.fontSize}px Arial`;
            const tw = ctx.measureText(ann.text).width;
            ctx.strokeStyle = '#667eea';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(ann.x, ann.y - ann.fontSize, tw, ann.fontSize);
            ctx.setLineDash([]);
            drawH(ann.x, ann.y - ann.fontSize);
            drawH(ann.x + tw, ann.y);
        }
        
        ctx.restore();
    }
}
