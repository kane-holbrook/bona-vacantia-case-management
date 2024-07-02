import { LightningElement, api, track } from 'lwc';

export default class CaseCreationProgressBar extends LightningElement {
    @api steps = [];
    @track currentStep = 0;

    connectedCallback() {
        this.updateSteps();
        console.log('steps from container', JSON.stringify(this.steps));
    }

    @api
    setCurrentStep(step) {
        this.currentStep = step;
        console.log('Current step:', this.currentStep);
        this.updateSteps();
    }

    get progressValue() {
        return (this.currentStep / this.steps.length) * 100;
    }

    get progressStyle() {
        return `height:${this.progressValue}%;`; // Since it's a vertical bar, change width to height
    }

    updateSteps() {
        this.steps = this.steps.map((step, index) => ({
            ...step,
            isCompleted: index < this.currentStep,
            isActive: index === this.currentStep,
            status: index < this.currentStep ? 'Complete' : index === this.currentStep ? 'Active' : '',
            stepClass: `slds-progress__item ${index < this.currentStep ? 'slds-is-completed' : ''} ${index === this.currentStep ? 'slds-is-active' : ''}`,
            markerClass: `slds-progress__marker ${index < this.currentStep ? 'slds-progress__marker_icon' : ''}`
        }));
    }
}