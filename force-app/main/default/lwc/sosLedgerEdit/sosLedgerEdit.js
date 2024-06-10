import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

const FIELDS = [
    'BV_Case__c.Name',
    'BV_Case__c.Forenames__c',
    'BV_Case__c.Surname__c',
    'BV_Case__c.Died__c',
];

export default class sosLedgerEdit extends LightningElement {
    isModalOpen = false;
    reference = '';
    cashAmount = '0';
    @api recordId;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    case;

    get deceasedName() {
        return this.case.data ? `${this.case.data.fields.Forenames__c.value} ${this.case.data.fields.Surname__c.value}` : 'No name specified';
    }

    get holderName() {
        return this.case.data ? `${this.case.data.fields.Holder__c.value}` : 'No holder specified'
    }

    get cashAmount() {

        this.cashAmount = '10000';
        return this.cashAmount;
    }

    get getReference() {
        // Return the reference for the record that is being edited
        // placeholder reference
        this.reference = 'Libero sed enim nulla sollicitudin. Erat arcu hac ultricies lacus et. Erat consequat mPostedbi aenean rhoncus arcu nec amet leo. Quis congue urna faucibus pellentesque aliquet suspendisse sapien.';
        return this.reference;
    }

    openModal() {
        this.isModalOpen = true;

    }
    
    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 3 + 'px';
    }

    // Wait until the modal is rendered before changing styling
    
    renderedCallback() {
        if (this.isModalOpen) {
            const textarea = this.template.querySelector('textarea');
            console.log(textarea);
            this.adjustTextareaHeight(textarea);
        }
    }



    closeModal() {
        this.isModalOpen = false;
    }

    saveModal() {
        // Perform save logic here
        this.isModalOpen = false;
    }
}