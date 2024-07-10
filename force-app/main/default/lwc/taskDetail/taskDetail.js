import { LightningElement, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import getSubTasks from '@salesforce/apex/TaskController.getSubTasks';
import TASK_NAME_FIELD from '@salesforce/schema/BV_Task__c.Name';
import TASK_PARENT_FIELD from '@salesforce/schema/BV_Task__c.Parent_Task__c';
import TASK_ASSIGNED_TO_FIELD from '@salesforce/schema/BV_Task__c.Assigned_To__c';
import TASK_DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';
import TASK_PRIORITY_FIELD from '@salesforce/schema/BV_Task__c.Priority__c';
import TASK_COMMENTS_FIELD from '@salesforce/schema/BV_Task__c.Comments__c';
import TASK_CREATED_BY_FIELD from '@salesforce/schema/BV_Task__c.Created_By__c';
import TASK_LAST_MODIFIED_BY_FIELD from '@salesforce/schema/BV_Task__c.Last_Modified_By__c';
import TASK_NEXT_TASK_FIELD from '@salesforce/schema/BV_Task__c.Next_Task__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskDetail extends LightningElement {
    @track editSubTask = false;
    @track deleteTask = false;
    @track changeDueDateTask = false;
    @track editCommentsTask = false;
    @track changePriorityTask = false;
    @track reassignTask = false;
    @track completeTask = false;

    @track recordId = 'a0A8E00000CrJ5HUAV'; // Placeholder for testing
    @track subTasks = [];

    @wire(getRecord, { recordId: '$recordId', fields: [TASK_NAME_FIELD, TASK_PARENT_FIELD, TASK_ASSIGNED_TO_FIELD, TASK_DUE_DATE_FIELD, TASK_PRIORITY_FIELD, TASK_COMMENTS_FIELD, TASK_CREATED_BY_FIELD, TASK_LAST_MODIFIED_BY_FIELD, TASK_NEXT_TASK_FIELD] })
    task;

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
                isOpen: false,
                sectionClass: 'slds-accordion__section',
                iconName: 'utility:chevronright'
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

    get taskName() {
        return this.task.data ? this.task.data.fields.Name.value : '';
    }

    get parentTask() {
        return this.task.data ? this.task.data.fields.Parent_Task__c.value : '';
    }

    get assignedTo() {
        return this.task.data ? this.task.data.fields.Assigned_To__c.value : '';
    }

    get dueDate() {
        return this.task.data ? this.task.data.fields.Due_Date__c.value : '';
    }

    get priority() {
        return this.task.data ? this.task.data.fields.Priority__c.value : '';
    }

    get comments() {
        return this.task.data ? this.task.data.fields.Comments__c.value : '';
    }

    get createdBy() {
        return this.task.data ? this.task.data.fields.Created_By__c.value : '';
    }

    get lastModifiedBy() {
        return this.task.data ? this.task.data.fields.Last_Modified_By__c.value : '';
    }

    get nextTask() {
        return this.task.data ? this.task.data.fields.Next_Task__c.value : '';
    }

    onEditSubTask() {
        this.editSubTask = true;
        this.currentSubTaskId = event.currentTarget.dataset.id;
    }

    onEditTaskClose() {
        this.editSubTask = false;
    }

    onDeleteTask() {
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