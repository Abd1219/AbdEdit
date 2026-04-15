export class DrawingUtils {
    static drawArrow(ctx, fromX, fromY, toX, toY, color, width) {
        const headLength = 25 + width * 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowBaseX = toX - (headLength * 0.6) * Math.cos(angle);
        const arrowBaseY = toY - (headLength * 0.6) * Math.sin(angle);
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(arrowBaseX, arrowBaseY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    static drawCurvedArrow(ctx, fromX, fromY, toX, toY, controlX, controlY, color, width) {
        const headLength = 25 + width * 2;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const t = 0.95;
        const x1 = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * controlX + t * t * toX;
        const y1 = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * controlY + t * t * toY;
        const angle = Math.atan2(toY - y1, toX - x1);
        
        const totalDist = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const arrowBaseX = toX - (headLength * 0.6) * Math.cos(angle);
        const baseDist = Math.sqrt(Math.pow(arrowBaseX - fromX, 2) + Math.pow(arrowBaseY - fromY, 2));
        const tEnd = Math.min(0.95, baseDist / totalDist);
        
        const curveEndX = (1 - tEnd) * (1 - tEnd) * fromX + 2 * (1 - tEnd) * tEnd * controlX + tEnd * tEnd * toX;
        const curveEndY = (1 - tEnd) * (1 - tEnd) * fromY + 2 * (1 - tEnd) * tEnd * controlY + tEnd * tEnd * toY;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.quadraticCurveTo(controlX, controlY, curveEndX, curveEndY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    static drawMeasureArrow(ctx, fromX, fromY, toX, toY, measureText, color, width) {
        const headLength = 25 + width * 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowBaseStartX = fromX + (headLength * 0.6) * Math.cos(angle);
        const arrowBaseStartY = fromY + (headLength * 0.6) * Math.sin(angle);
        const arrowBaseEndX = toX - (headLength * 0.6) * Math.cos(angle);
        const arrowBaseEndY = toY - (headLength * 0.6) * Math.sin(angle);
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(arrowBaseStartX, arrowBaseStartY);
        ctx.lineTo(arrowBaseEndX, arrowBaseEndY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(fromX + headLength * Math.cos(angle - Math.PI / 6), fromY + headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(fromX + headLength * Math.cos(angle + Math.PI / 6), fromY + headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        ctx.font = `bold ${14 + width}px Arial`;
        const textMetrics = ctx.measureText(measureText);
        const textWidth = textMetrics.width;
        const textHeight = 14 + width;
        const padding = 6 + width / 4;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(midX - textWidth / 2 - padding, midY - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(midX - textWidth / 2 - padding, midY - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
        
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(measureText, midX, midY);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    static applyBlur(ctx, x, y, width, height, originalCanvas) {
        if (!originalCanvas) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.filter = 'blur(15px)';
        ctx.drawImage(originalCanvas, 0, 0);
        ctx.restore();
    }
}
