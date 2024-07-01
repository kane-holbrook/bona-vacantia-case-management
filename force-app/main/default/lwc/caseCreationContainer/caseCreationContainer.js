import { LightningElement, track } from 'lwc';
import getFlowMetadata from '@salesforce/apex/FlowMetadataController.getFlowMetadata';

export default class CaseCreationContainer extends LightningElement {
    @track currentStep = 0; // Start from the first step (index 0)
    @track steps = [];

    connectedCallback() {
        this.fetchFlowMetadata();
    }

    fetchFlowMetadata() {
        getFlowMetadata({ flowApiName: 'Case_Creation_Flow', caseType: 'Estates' })
            .then((result) => {
                this.steps = result.map((step, index) => ({
                    label: step.label,
                    isCompleted: false,
                    isActive: index === 0
                }));
                console.log('steps', this.steps);
                this.updateProgressBar(this.currentStep);
            })
            .catch((error) => {
                console.error('Error fetching flow metadata:', error);
            });
    }

    handleStatusChange(event) {
        const status = event.detail.status;
        if (status === 'FINISHED') {
            // Handle flow finish status
        }
    }

    handleScreenChange(event) {
        const newStep = this.calculateStepFromFlow(event.detail);
        this.currentStep = newStep;
        this.updateProgressBar(newStep);
    }

    updateProgressBar(step) {
        const progressBar = this.template.querySelector('c-case-creation-progress-bar');
        if (progressBar) {
            progressBar.setCurrentStep(step); // Update step in progress bar

            console.log('Progress bar detected');
        }
    }

    calculateStepFromFlow(flowDetails) {
        // Logic to determine the step based on flow details
        return flowDetails.activeStageOrder; // Assuming activeStageOrder is zero-based
    }
}