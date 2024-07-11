import { LightningElement, track, api } from 'lwc';
import { deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class HistoryDeleteModal extends LightningElement {
    @api record;
    @track date;
    @track action;
    @track documentType;
    @track correspondence;
    @track draft;
    @track user;

    connectedCallback() {
        this.date = this.record.Date_Inserted__c || '';
        this.action = this.record.Action__c || '';
        this.documentType = this.record.Document_Type__c || '';
        this.correspondence = this.record.Correspondence__c || '';
        this.draft = this.record.Draft__c || '';
        this.user = this.record.User__c || '';
    }

    @api
    deleteRecord() {
        deleteRecord(this.record.Id)
            .then(() => {
                this.showToast('Success', 'Record deleted successfully', 'success');
                this.dispatchEvent(new CustomEvent('delete'));
            })
            .catch(error => {
                this.showToast('Error', 'Error deleting record: ' + error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}