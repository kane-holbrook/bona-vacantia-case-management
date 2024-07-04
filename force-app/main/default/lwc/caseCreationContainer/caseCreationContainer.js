import { LightningElement, track } from 'lwc';
import getFlowMetadata from '@salesforce/apex/FlowMetadataController.getFlowMetadata';

export default class CaseCreationContainer extends LightningElement {
    @track currentStep = 0;
    @track steps = [];
    @track progressValue = 0;
    caseType = 'Estates'; // Default case type

    connectedCallback() {
        this.fetchFlowMetadata();
        this.template.addEventListener('casetypeevent', this.handleCaseTypeEvent.bind(this));
        this.template.addEventListener('next', this.handleNext.bind(this));
        this.template.addEventListener('back', this.handleBack.bind(this));
    }

    handleCaseTypeEvent(event) {
        const newCaseType = event.detail.caseType;
        if (newCaseType) {
            this.caseType = newCaseType;
            this.fetchFlowMetadata().then(() => {
                // Set currentStep to 1 after fetching new metadata
                this.currentStep = 1;
                this.updateSteps();
                this.updateProgressBar();
            });
        }
    }

    fetchFlowMetadata() {
        return getFlowMetadata({ flowApiName: 'Case_Creation_Flow', caseType: this.caseType })
            .then((result) => {
                this.steps = result.map((step, index) => ({
                    label: step.label,
                    isCompleted: false,
                    isActive: index === 0,
                    activeStatus: index === 0 ? 'Active' : '',
                    class: index === 0 ? 'slds-progress__item slds-is-active' : 'slds-progress__item'
                }));
                console.log('steps:', this.steps);
                this.updateProgressBar(this.currentStep);
            })
            .catch((error) => {
                console.error('Error fetching flow metadata:', error);
            });
    }

    handleStatusChange(event) {
        const status = event.detail.status;
        if (status === 'FINISHED') {
            window.location.href = 'https://governmentlegaldepartment--sandbox.sandbox.lightning.force.com/lightning/o/BV_Case__c/list?filterName=My_Cases';
        }
    }

    handleNext() {
        console.log('handleNext');
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updateSteps();
        }
    }

    handleBack() {
        console.log('handleBack');
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateSteps();
        }
    }

    updateSteps() {
        this.steps = this.steps.map((step, index) => {
            if (index < this.currentStep) {
                return {
                    ...step,
                    isCompleted: true,
                    isActive: false,
                    class: 'slds-progress__item slds-is-completed'
                };
            } else if (index === this.currentStep) {
                return {
                    ...step,
                    isCompleted: false,
                    isActive: true,
                    class: 'slds-progress__item slds-is-active'
                };
            } else {
                return {
                    ...step,
                    isCompleted: false,
                    isActive: false,
                    class: 'slds-progress__item'
                };
            }
        });
    }

    updateProgressBar() {
        this.progressValue = Math.floor((this.currentStep / (this.steps.length - 1)) * 100);
    }
}