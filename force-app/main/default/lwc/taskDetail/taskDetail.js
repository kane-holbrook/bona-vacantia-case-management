import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getSubTasks from '@salesforce/apex/TaskController.getSubTasks';
import TASK_NAME_FIELD from '@salesforce/schema/BV_Task__c.Name';
import TASK_PARENT_FIELD from '@salesforce/schema/BV_Task__c.Parent_Task__c';
import TASK_ASSIGNED_TO_FIELD from '@salesforce/schema/BV_Task__c.Assigned_To__c';
import TASK_DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';
import TASK_PRIORITY_FIELD from '@salesforce/schema/BV_Task__c.Priority__c';
import TASK_COMMENTS_FIELD from '@salesforce/schema/BV_Task__c.Comments__c';
import TASK_CREATED_BY_FIELD from '@salesforce/schema/BV_Task__c.CreatedById';
import TASK_LAST_MODIFIED_BY_FIELD from '@salesforce/schema/BV_Task__c.LastModifiedById';
import TASK_NEXT_TASK_FIELD from '@salesforce/schema/BV_Task__c.Next_Task__c';
import TASK_DESCRIPTION_FIELD from '@salesforce/schema/BV_Task__c.Description__c';
import TASK_DATE_INSERTED_FIELD from '@salesforce/schema/BV_Task__c.Date_Inserted__c';
import TASK_GROUP_CODE_FIELD from '@salesforce/schema/BV_Task__c.Group_Code__c';
import TASK_OTHER_PARTY_FIELD from '@salesforce/schema/BV_Task__c.Other_party__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskDetail extends LightningElement {
    @api recordId;
    @track editSubTask = false;
    @track deleteTask = false;
    @track changeDueDateTask = false;
    @track editCommentsTask = false;
    @track changePriorityTask = false;
    @track reassignTask = false;
    @track completeTask = false;
    @track subTasks = [];
    @track assignedToName = '';
    @track createdByName = '';
    @track lastModifiedByName = '';

    @wire(getRecord, { recordId: '$recordId', fields: [
        TASK_NAME_FIELD, TASK_PARENT_FIELD, TASK_ASSIGNED_TO_FIELD, TASK_DUE_DATE_FIELD, TASK_PRIORITY_FIELD, 
        TASK_COMMENTS_FIELD, TASK_CREATED_BY_FIELD, TASK_LAST_MODIFIED_BY_FIELD, TASK_NEXT_TASK_FIELD, 
        TASK_DESCRIPTION_FIELD, TASK_DATE_INSERTED_FIELD, TASK_GROUP_CODE_FIELD, TASK_OTHER_PARTY_FIELD
    ] })
    wiredTask({ error, data }) {
        if (data) {
            this.task = data;
            const userIds = [
                getFieldValue(data, TASK_ASSIGNED_TO_FIELD),
                getFieldValue(data, TASK_CREATED_BY_FIELD),
                getFieldValue(data, TASK_LAST_MODIFIED_BY_FIELD)
            ];
            this.fetchUserNames(userIds);
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading task',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        }
    }

    @wire(getSubTasks, { parentTaskId: '$recordId' })
    wiredSubTasks({ error, data }) {
        if (data) {
            this.subTasks = data.map(record => ({
                Id: record.Id,
                Name: record.Name,
                Assigned_To__c: record.Assigned_To__c,
                Due_Date__c: record.Due_Date__c,
                Priority__c: record.Priority__c,
                Comments__c: record.Comments__c,
                Description__c: record.Description__c,
                Date_Inserted__c: record.Date_Inserted__c,
                isOpen: false,
                sectionClass: 'slds-accordion__section',
                iconName: 'utility:chevronright',
                formattedDateInserted: this.formatDate(record.Date_Inserted__c),
                formattedDueDate: this.formatDate(record.Due_Date__c)
            }));
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading subtasks',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        }
    }

    fetchUserNames(userIds) {
        getUserNames({ userIds })
            .then(result => {
                this.assignedToName = result[getFieldValue(this.task, TASK_ASSIGNED_TO_FIELD)];
                this.createdByName = result[getFieldValue(this.task, TASK_CREATED_BY_FIELD)];
                this.lastModifiedByName = result[getFieldValue(this.task, TASK_LAST_MODIFIED_BY_FIELD)];
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error fetching user names',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }

    formatDate(dateString) {
        if (!dateString) {
            return '';
        }
        const date = new Date(dateString);
        const day = ('0' + date.getDate()).slice(-2);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    get taskName() {
        return getFieldValue(this.task, TASK_NAME_FIELD);
    }

    get parentTask() {
        return getFieldValue(this.task, TASK_PARENT_FIELD);
    }

    get assignedTo() {
        return getFieldValue(this.task, TASK_ASSIGNED_TO_FIELD);
    }

    get dueDate() {
        return getFieldValue(this.task, TASK_DUE_DATE_FIELD);
    }

    get priority() {
        return getFieldValue(this.task, TASK_PRIORITY_FIELD);
    }

    get comments() {
        return getFieldValue(this.task, TASK_COMMENTS_FIELD);
    }

    get createdBy() {
        return getFieldValue(this.task, TASK_CREATED_BY_FIELD);
    }

    get lastModifiedBy() {
        return getFieldValue(this.task, TASK_LAST_MODIFIED_BY_FIELD);
    }

    get nextTask() {
        return getFieldValue(this.task, TASK_NEXT_TASK_FIELD);
    }

    onEditSubTask(event) {
        this.editSubTask = true;
        this.currentSubTaskId = event.currentTarget.dataset.id;
    }

    onEditTaskClose() {
        this.editSubTask = false;
    }

    onDeleteTask(event) {
        this.deleteTask = true;
        this.currentSubTaskId = event.currentTarget.dataset.id;
    }

    onDeleteTaskClose() {
        this.deleteTask = false;
    }

    onChangeDueDateTask() {
        this.changeDueDateTask = true;
    }

    onChangeDueDateTaskClose() {
        this.changeDueDateTask = false;
    }

    onEditCommentsTask() {
        this.editCommentsTask = true;
    }

    onEditCommentsTaskClose() {
        this.editCommentsTask = false;
    }

    onChangePriorityTask() {
        this.changePriorityTask = true;
    }

    onChangePriorityTaskClose() {
        this.changePriorityTask = false;
    }

    onReassignTaskOpen() {
        this.reassignTask = true;
    }

    onReassignTaskClose() {
        this.reassignTask = false;
    }

    onCompleteTask() {
        this.completeTask = true;
    }

    onCompleteTaskClose() {
        this.completeTask = false;
    }

    handleSave() {
        const fields = {};
        fields[TASK_NAME_FIELD.fieldApiName] = this.taskName;
        fields[TASK_COMMENTS_FIELD.fieldApiName] = this.comments;

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task updated successfully',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating task',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }

    handleDelete() {
        const deleteModal = this.template.querySelector('c-task-delete-modal');
        deleteModal.deleteRecord();
    }

    toggleSubTask(event) {
        const subTaskId = event.currentTarget.dataset.id;
        this.subTasks = this.subTasks.map(subTask => {
            if (subTask.Id === subTaskId) {
                subTask.isOpen = !subTask.isOpen;
                subTask.sectionClass = subTask.isOpen ? 'slds-accordion__section slds-is-open' : 'slds-accordion__section';
                subTask.iconName = subTask.isOpen ? 'utility:chevrondown' : 'utility:chevronright';
            }
            return subTask;
        });
    }

    confirmCompleteTask() {
        const fields = {};
        fields.Id = this.recordId;
        fields[TASK_COMPLETE_FIELD.fieldApiName] = true;

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task marked as complete',
                        variant: 'success'
                    })
                );
                this.completeTask = false;
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error marking task complete',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }
}