import { LightningElement, api, track } from 'lwc';

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
    openSharePointLink() {
        // Open the SharePoint URL in a new tab
        window.open(this.documentUrl, '_blank');
    }

    handleFinish() {
        window.location.reload();
    }
}