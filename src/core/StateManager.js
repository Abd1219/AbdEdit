export class StateManager {
    constructor() {
        this.annotations = [];
        this.history = [];
        this.historyStep = -1;
    }

    addAnnotation(annotation) {
        this.annotations.push(annotation);
        this.saveHistory();
    }

    removeAnnotation(index) {
        if (index >= 0 && index < this.annotations.length) {
            this.annotations.splice(index, 1);
            this.saveHistory();
        }
    }

    clearAnnotations() {
        if (this.annotations.length === 0) return;
        this.annotations = [];
        this.saveHistory();
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.annotations = JSON.parse(JSON.stringify(this.history[this.historyStep]));
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.annotations = JSON.parse(JSON.stringify(this.history[this.historyStep]));
            return true;
        }
        return false;
    }

    saveHistory() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.splice(this.historyStep);
        }
        this.history.push(JSON.parse(JSON.stringify(this.annotations)));
    }

    reset() {
        this.annotations = [];
        this.history = [];
        this.historyStep = -1;
        this.saveHistory();
    }
}
