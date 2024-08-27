import { LightningElement, api, track } from 'lwc';
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';

export default class GenerateOpenDocumentFlow extends LightningElement {
    @api documentUrl; // The SharePoint URL passed from the flow
    @track value = ''; // To track the selected radio button

    // Options for the radio buttons
    get options() {
        return [
            { label: 'Yes, open document', value: 'yes' },
            { label: 'No', value: 'no' }
        ];
    }

    // Handle the change of radio button selection
    handleRadioChange(event) {
        this.value = event.detail.value;
        console.log('Selected value:', this.value);
    }

    // Handle the Finish button click
    handleFinish() {
        console.log('documenturl', this.documentUrl);
        if (this.value === 'yes' && this.documentUrl) {
            // Open SharePoint document in new tab
            window.open(this.documentUrl, '_blank');
        }

        // Close the flow regardless of the selection
        const navigateNextEvent = new FlowNavigationFinishEvent();
        this.dispatchEvent(navigateNextEvent);
    }
}