export class EventManager {
    constructor(app, canvas) {
        this.app = app;
        this.canvas = canvas;
        this.init();
    }

    init() {
        // Mouse/Touch events
        const canvas = this.canvas;
        canvas.addEventListener('mousedown', (e) => this.app.handleDown(e));
        canvas.addEventListener('mousemove', (e) => this.app.handleMove(e));
        canvas.addEventListener('mouseup', (e) => this.app.handleUp(e));
        canvas.addEventListener('dblclick', (e) => this.app.handleDoubleClick(e));

        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.app.handleDown(e); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.app.handleMove(e); }, { passive: false });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.handleTouchEnd(e); }, { passive: false });

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Unload protection
        window.addEventListener('beforeunload', (e) => {
            if (this.app.state.annotations.length > 0 || this.app.engine.image) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
    }

    handleTouchEnd(e) {
        if (e.changedTouches && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            this.app.handleUp({ clientX: t.clientX, clientY: t.clientY });
        }
    }

    handleKeyDown(e) {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.app.undo(); }
        else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.app.redo(); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && this.app.selectedAnnotation) {
            e.preventDefault(); this.app.deleteSelected();
        }
    }
}
