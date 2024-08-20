import { LightningElement, api, track, wire } from 'lwc';
import { deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getTaskById from '@salesforce/apex/TaskController.getTaskById';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getSubTasks from '@salesforce/apex/TaskController.getSubTasks';

export default class TaskDeleteModal extends LightningElement {
    @api recordId;
    @track taskName;
    @track description;
    @track caseOfficers;
    @track caseOfficerNames = '';
    @track category;
    @track priority;
    @track waitingPeriod;
    @track dateInserted;
    @track due;
    @track document;
    @track groupCode;
    @track otherParty;
    @track subTaskCount = 0;

    @wire(getTaskById, { taskId: '$recordId' })
    wiredTask({ error, data }) {
        if (data) {
            this.taskName = data.Name;
            this.description = data.Description__c;
            this.caseOfficers = data.Assigned_To__c;
            this.category = data.Category__c;
            this.priority = data.Priority__c;
            this.waitingPeriod = this.calculateWaitingPeriod(data.Date_Inserted__c, data.Due_Date__c);
            this.dateInserted = data.Date_Inserted__c;
            this.due = data.Due_Date__c;
            this.document = data.Document__c;
            this.groupCode = data.Group_Code__c;
            this.otherParty = data.Other_party__c;
            this.comments = data.Comments__c;

            if (this.caseOfficers) {
                getUserNames({ userIds: [this.caseOfficers] })
                    .then(result => {
                        this.caseOfficerNames = result[this.caseOfficers] || this.caseOfficers;
                    })
                    .catch(error => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error fetching case officer names',
                                message: error.body.message,
                                variant: 'error'
                            })
                        );
                    });
            }

            getSubTasks({ parentTaskId: this.recordId })
                .then(result => {
                    if (!data.Parent_Task__c) {
                        this.subTaskCount = result.length;
                    }
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error fetching subtasks',
                            message: error.body.message,
                            variant: 'error'
                        })
                    );
                });
        } else if (error) {
            // handle error
        }
    }

    calculateWaitingPeriod(dateInserted, dueDate) {
        if (!dateInserted || !dueDate) return '';

        const dateInsertedObj = new Date(dateInserted);
        const dueDateObj = new Date(dueDate);
        const timeDifference = dueDateObj - dateInsertedObj;

        const absDifference = Math.abs(timeDifference);
        const dayDifference = absDifference / (1000 * 3600 * 24);
        let waitingPeriod = '';

        if (dayDifference <= 30) {
            waitingPeriod = `${Math.round(dayDifference)} days`;
        } else if (dayDifference <= 365) {
            waitingPeriod = `${Math.round(dayDifference / 7)} weeks`;
        } else {
            waitingPeriod = `${Math.round(dayDifference / 30)} months`;
        }

        return `${waitingPeriod} ${timeDifference > 0 ? 'after' : 'before'} date inserted`;
    }

    @api
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
                this.dispatchEvent(new CustomEvent('taskdeleted'));
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