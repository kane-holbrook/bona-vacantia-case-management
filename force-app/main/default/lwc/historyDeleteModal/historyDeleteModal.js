import { LightningElement, track, api } from 'lwc';

export default class HistoryDeleteModal extends LightningElement {
    @api record;
    @track date;
    @track action;
    @track documentType;
    @track correspondence
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
}