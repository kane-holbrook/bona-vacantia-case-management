import { LightningElement, api, track } from 'lwc';

export default class CaseCreationProgressBar extends LightningElement {
    @api currentStep;
    @api steps = [];

    get progressValue() {
        return (this.currentStep / this.steps.length) * 100;
    }

    get progressStyle() {
        return `width:${this.progressValue}%`;
    }

    @api updateStep(step) {
        this.currentStep = step;
        this.updateSteps();
    }

    updateSteps() {
        this.steps = this.steps.map((step, index) => {
            return {
                ...step,
                isCompleted: index < this.currentStep,
                isActive: index === this.currentStep,
                stepClass: `slds-progress__item ${index < this.currentStep ? 'slds-is-completed' : ''} ${index === this.currentStep ? 'slds-is-active' : ''}`,
                markerClass: `slds-progress__marker ${index < this.currentStep ? 'slds-progress__marker_icon' : ''}`
            };
        });
    }
}
