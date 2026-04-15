export class ToolRegistry {
    static isPointInAnnotation(ann, x, y, ctx) {
        const tol = 40;
        if (['line', 'arrow', 'measure-arrow'].includes(ann.tool)) {
            return this.distanceToLine(x, y, ann.startX, ann.startY, ann.endX, ann.endY) < tol;
        } else if (ann.tool === 'curved-arrow') {
            const steps = 30;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const cx = (1 - t) * (1 - t) * ann.startX + 2 * (1 - t) * t * ann.controlX + t * t * ann.endX;
                const cy = (1 - t) * (1 - t) * ann.startY + 2 * (1 - t) * t * ann.controlY + t * t * ann.endY;
                if (Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2)) < tol * 2) return true;
            }
            return false;
        } else if (['rectangle', 'highlight', 'blur', 'ellipse', 'triangle'].includes(ann.tool)) {
            return x >= ann.x - tol && x <= ann.x + ann.width + tol && y >= ann.y - tol && y <= ann.y + ann.height + tol;
        } else if (ann.tool === 'circle') {
            const dist = Math.sqrt(Math.pow(x - ann.x, 2) + Math.pow(y - ann.y, 2));
            return Math.abs(dist - ann.radius) < tol;
        } else if (ann.tool === 'angle') {
            return this.distanceToLine(x, y, ann.vertexX, ann.vertexY, ann.line1EndX, ann.line1EndY) < tol * 1.5 ||
                   this.distanceToLine(x, y, ann.vertexX, ann.vertexY, ann.line2EndX, ann.line2EndY) < tol * 1.5;
        } else if (ann.tool === 'polygon') {
            for (let i = 0; i < ann.points.length; i++) {
                const p1 = ann.points[i], p2 = ann.points[(i + 1) % ann.points.length];
                if (this.distanceToLine(x, y, p1.x, p1.y, p2.x, p2.y) < tol) return true;
            }
            return this.isPointInPolygon(x, y, ann.points);
        } else if (ann.tool === 'pencil') {
            for (let i = 0; i < ann.points.length - 1; i++) {
                if (this.distanceToLine(x, y, ann.points[i].x, ann.points[i].y, ann.points[i+1].x, ann.points[i+1].y) < tol) return true;
            }
            return false;
        } else if (ann.tool === 'text') {
            ctx.font = `${ann.fontSize}px Arial`;
            const tw = ctx.measureText(ann.text).width;
            return x >= ann.x - tol && x <= ann.x + tw + tol && y >= ann.y - ann.fontSize - tol && y <= ann.y + tol;
        }
        return false;
    }

    static distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D, lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        return Math.sqrt(Math.pow(px - xx, 2) + Math.pow(py - yy, 2));
    }

    static isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y, xj = points[j].x, yj = points[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }

    static getResizeHandle(ann, x, y, ctx) {
        if (!ann) return null;
        const hs = 45;
        if (['rectangle', 'highlight', 'blur', 'ellipse', 'triangle'].includes(ann.tool)) {
            const handles = [
                {n: 'nw', x: ann.x, y: ann.y}, {n: 'ne', x: ann.x + ann.width, y: ann.y},
                {n: 'sw', x: ann.x, y: ann.y + ann.height}, {n: 'se', x: ann.x + ann.width, y: ann.y + ann.height}
            ];
            const h = handles.find(h => Math.abs(x - h.x) < hs && Math.abs(y - h.y) < hs);
            return h ? h.n : null;
        } else if (ann.tool === 'polygon') {
            const idx = ann.points.findIndex(p => Math.abs(x - p.x) < hs && Math.abs(y - p.y) < hs);
            return idx !== -1 ? 'point' + idx : null;
        } else if (['line', 'arrow', 'measure-arrow', 'curved-arrow'].includes(ann.tool)) {
            if (ann.tool === 'curved-arrow' && Math.sqrt(Math.pow(x - ann.controlX, 2) + Math.pow(y - ann.controlY, 2)) < hs * 3) return 'control';
            if (Math.abs(x - ann.startX) < hs && Math.abs(y - ann.startY) < hs) return 'start';
            if (Math.abs(x - ann.endX) < hs && Math.abs(y - ann.endY) < hs) return 'end';
        } else if (ann.tool === 'angle') {
            if (Math.abs(x - ann.vertexX) < hs && Math.abs(y - ann.vertexY) < hs) return 'vertex';
            if (Math.abs(x - ann.line1EndX) < hs && Math.abs(y - ann.line1EndY) < hs) return 'line1End';
            if (Math.abs(x - ann.line2EndX) < hs && Math.abs(y - ann.line2EndY) < hs) return 'line2End';
        } else if (ann.tool === 'circle' && Math.abs(x - (ann.x + ann.radius)) < hs && Math.abs(y - ann.y) < hs) return 'radius';
        else if (ann.tool === 'text') {
            ctx.font = `${ann.fontSize}px Arial`;
            const tw = ctx.measureText(ann.text).width;
            if (Math.abs(x - (ann.x + tw)) < hs && Math.abs(y - ann.y) < hs) return 'fontSize';
        }
        return null;
    }

    static moveAnnotation(ann, dx, dy) {
        if (['line', 'arrow', 'curved-arrow', 'measure-arrow'].includes(ann.tool)) {
            ann.startX += dx; ann.startY += dy; ann.endX += dx; ann.endY += dy;
            if (ann.controlX !== undefined) { ann.controlX += dx; ann.controlY += dy; }
        } else if (['rectangle', 'highlight', 'blur', 'ellipse', 'triangle', 'circle', 'text'].includes(ann.tool)) {
            ann.x += dx; ann.y += dy;
        } else if (ann.tool === 'polygon' || ann.tool === 'pencil') {
            ann.points.forEach(p => { p.x += dx; p.y += dy; });
        } else if (ann.tool === 'angle') {
            ann.vertexX += dx; ann.vertexY += dy; ann.line1EndX += dx; ann.line1EndY += dy; ann.line2EndX += dx; ann.line2EndY += dy;
        }
    }

    static resizeAnnotation(ann, handle, x, y) {
        if (['rectangle', 'highlight', 'blur', 'ellipse', 'triangle'].includes(ann.tool)) {
            if (handle === 'se') { ann.width = x - ann.x; ann.height = y - ann.y; }
            else if (handle === 'nw') { ann.width += (ann.x - x); ann.height += (ann.y - y); ann.x = x; ann.y = y; }
            else if (handle === 'ne') { ann.width = x - ann.x; ann.height += (ann.y - y); ann.y = y; }
            else if (handle === 'sw') { ann.width += (ann.x - x); ann.x = x; ann.height = y - ann.y; }
        } else if (['line', 'arrow', 'measure-arrow', 'curved-arrow'].includes(ann.tool)) {
            if (handle === 'start') { ann.startX = x; ann.startY = y; }
            else if (handle === 'end') { ann.endX = x; ann.endY = y; }
            else if (handle === 'control') { ann.controlX = x; ann.controlY = y; }
        } else if (ann.tool === 'angle') {
            if (handle === 'vertex') { ann.vertexX = x; ann.vertexY = y; }
            else if (handle === 'line1End') { ann.line1EndX = x; ann.line1EndY = y; }
            else if (handle === 'line2End') { ann.line2EndX = x; ann.line2EndY = y; }
        } else if (ann.tool === 'circle') {
            ann.radius = Math.sqrt(Math.pow(x - ann.x, 2) + Math.pow(y - ann.y, 2));
        } else if (ann.tool === 'polygon' && handle.startsWith('point')) {
            const idx = parseInt(handle.replace('point', ''));
            if (ann.points[idx]) { ann.points[idx].x = x; ann.points[idx].y = y; }
        } else if (ann.tool === 'text' && handle === 'fontSize') {
            ann.fontSize = Math.max(12, Math.min(72, Math.round(Math.abs(y - ann.y))));
            ann.height = ann.fontSize;
        }
    }
}
