import { LightningElement, api, track, wire } from 'lwc';
import { deleteRecord } from 'lightning/uiRecordApi';
import getTaskById from '@salesforce/apex/TaskController.getTaskById';

export default class TaskDeleteModal extends LightningElement {
    @api recordId;
    @track taskName;
    @track description;
    @track scheduleCode;
    @track caseOfficers;
    @track category;
    @track priority;
    @track waitingPeriod;
    @track dateInserted;
    @track due;
    @track document;
    @track postTray;
    @track groupCode;
    @track otherParty;

    @wire(getTaskById, { taskId: '$recordId' })
    wiredTask({ error, data }) {
        if (data) {
            this.taskName = data.Name;
            this.description = data.Description__c;
            this.scheduleCode = data.Schedule_Code__c;
            this.caseOfficers = data.Assigned_To__c;
            this.category = data.Category__c;
            this.priority = data.Priority__c;
            this.waitingPeriod = data.Waiting_Period__c;
            this.dateInserted = data.Date_Inserted__c;
            this.due = data.Due_Date__c;
            this.document = data.Document__c;
            this.postTray = data.Post_Tray__c;
            this.groupCode = data.Group_Code__c;
            this.otherParty = data.Other_party__c;
        } else if (error) {
            // handle error
        }
    }

    deleteRecord() {
        deleteRecord(this.recordId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task deleted successfully',
                        variant: 'success'
                    })
                );
                this.dispatchEvent(new CustomEvent('close'));
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error deleting task',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }
}