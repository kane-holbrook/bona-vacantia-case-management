import { LightningElement, track, api } from 'lwc';
import { deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import deleteSharePointFolder from '@salesforce/apex/FileControllerGraph.deleteSharePointFolder';
import getBVCaseData from '@salesforce/apex/EstateDataController.getBVCaseData';

export default class HistoryDeleteModal extends LightningElement {
    @api record;
    @track date;
    @track action;
    @track documentType;
    @track correspondence;
    @track draft;
    @track user;

    connectedCallback() {
        this.date = this.record.Date_Inserted_Time__c || '';
        this.action = this.record.Action__c || '';
        this.documentType = this.record.Document_Type__c || '';
        this.correspondence = this.record.Correspondence__c || '';
        this.draft = this.record.Draft__c || '';
        this.user = this.record.User__c || '';
    }

    @api
    deleteRecord() {
        console.log(this.record);
        console.log('deleting record');

        // First, get the BV Case Data
        getBVCaseData({ recordId: this.record.BV_Case__c })
            .then(caseData => {
                // Then, delete the SharePoint folder
                const folderPath = `${caseData.Name}/${this.record.Id}`;
                return deleteSharePointFolder({ folderPath: folderPath });
            })
            .then(() => {
                // If SharePoint folder deletion is successful, delete the Salesforce record
                const deletePromises = [deleteRecord(this.record.Id)];
                
                // If EmailMessageId__c is present, also delete the EmailMessage
                if (this.record.EmailMessageId__c) {
                    deletePromises.push(deleteRecord(this.record.EmailMessageId__c));
                }
                
                return Promise.all(deletePromises);
            })
            .then(() => {
                this.showToast('Success', 'Record, associated SharePoint folder, and related EmailMessage (if any) deleted successfully', 'success');
                this.dispatchEvent(new CustomEvent('delete'));
            })
            .catch(error => {
                this.showToast('Error', 'Error deleting record, SharePoint folder, or related EmailMessage: ' + error.body.message, 'error');
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