import { LightningElement, api } from 'lwc';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import createAccrual from '@salesforce/apex/SOSFinanceController.createAccrual';

export default class SosCreateAccrual extends LightningElement {
    @api caseNumber;
    isModalOpen = false;
    selectedAccrualType = '';
    accrualTypeOptions = [
        { label: 'Receipt', value: 'Receipt' },
        { label: 'Payment', value: 'Payment' }
    ];
    isReceiptFlow = true;
    isFlowRendered = false;

    get selectedFlow() {
        return this.selectedAccrualType === 'Receipt' ? 'SOS_Add_Accural_Receipt' : 'SOS_Add_Accural_Payment';
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleAccrualTypeChange(event) {
        this.selectedAccrualType = event.detail.value;
    }

    handleConfirmSelection() {
        this.isReceiptFlow = this.selectedAccrualType === 'Receipt';
        this.isFlowRendered = true;
    }

    handleCreateAccrual() {
        this.closeModal();
    }

    handleFlowStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            const outputVariables = event.detail.outputVariables;
            console.log('outputVariables', outputVariables);
            let flowOutput = {};

            outputVariables.forEach(variable => {
                flowOutput[variable.name] = variable.value;
            });

            this.createAccrual(flowOutput);
        }
    }

    createAccrual(flowOutput) {
        // Construct the narrative (AssignmentType + AssetType + AddressType)
        let narrative = flowOutput.AssignmentType + ' ' + flowOutput.AssetType + ' ' + flowOutput.AddressType;
        
        createAccrual({
            MtCode: this.caseNumber,
            Net: flowOutput.AmountReceived,
            Narrative: narrative,
            Reference: 'Test reference',
            Type: 'CR'
        })
        .then(result => {
            console.log('Accrual created successfully:', result);
            window.location.reload();
        })
        .catch(error => {
            console.error('Error creating accrual:', error);
            // Handle the error
        });
    }

    handleNext() {
        const navigateNextEvent = new FlowNavigationNextEvent();
        this.dispatchEvent(navigateNextEvent);
    }
}