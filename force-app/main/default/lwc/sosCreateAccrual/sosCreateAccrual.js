import { LightningElement, api } from 'lwc';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import createAccrual from '@salesforce/apex/SOSFinanceController.createAccrual';

export default class SosCreateAccrual extends LightningElement {
    @api caseNumber;
    @api caseId;
    isModalOpen = false;
    selectedAccrualType = '';
    accrualTypeOptions = [
        { label: 'Receipt', value: 'Receipt' },
        { label: 'Payment', value: 'Payment' }
    ];
    isReceiptFlow = true;
    isFlowRendered = false;
    flowInputs;

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
        
        // Set up the flow inputs
        this.flowInputs = [
            {
                name: 'caseID',
                type: 'String',
                value: this.caseId
            }
        ];
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

        // If ReceiptType is "ARE2", then Type is "CR", otherwise Type is "DR"
        let type = flowOutput.ReceiptType === 'ARE2' ? 'CR' : 'DR';
        
        createAccrual({
            MtCode: this.caseNumber,
            Net: flowOutput.AmountReceived,
            Narrative: narrative,
            Reference: 'Test reference',
            Type: type
        })
        .then(result => {
            console.log('Accrual created successfully:', result);
            // Dispatch a custom event to notify the parent component
            this.dispatchEvent(new CustomEvent('accrualcreated', {
                detail: { recordId: this.caseId },
                bubbles: true,
                composed: true
            }));
            this.closeModal();
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