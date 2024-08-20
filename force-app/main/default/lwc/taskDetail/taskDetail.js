import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getSubTasks from '@salesforce/apex/TaskController.getSubTasks';
import fetchFilesByIds from '@salesforce/apex/FileControllerGraph.fetchFilesByIds';
import TASK_ID_FIELD from '@salesforce/schema/BV_Task__c.Id';
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
import TASK_TEMPLATES_FIELD from '@salesforce/schema/BV_Task__c.Templates__c';
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
    @track createSubTask = false;
    @track isParentTask = false;
    @track taskDeleteMarkedComplete = false;
    @track templates = [];
    @track isFlowModalOpen = false;
    @track selectedTemplate = '';
    @track selectedDocumentType = '';  // Holds the document type
    @track flowInputs = [];  // Array to store input variables for the flow
    currentSubTaskId; // Added this to track current sub-task ID
    parentTaskId;
    editTaskState; // Added this to track current task ID
    wiredTaskResult;
    wiredSubTaskResult;

    @wire(getRecord, { recordId: '$recordId', fields: [
        TASK_ID_FIELD, TASK_NAME_FIELD, TASK_PARENT_FIELD, TASK_ASSIGNED_TO_FIELD, TASK_DUE_DATE_FIELD, TASK_PRIORITY_FIELD, 
        TASK_COMMENTS_FIELD, TASK_CREATED_BY_FIELD, TASK_LAST_MODIFIED_BY_FIELD, TASK_NEXT_TASK_FIELD, 
        TASK_DESCRIPTION_FIELD, TASK_DATE_INSERTED_FIELD, TASK_GROUP_CODE_FIELD, TASK_OTHER_PARTY_FIELD
    ] })
    wiredTask(result) {
        this.wiredTaskResult = result;
        const { error, data } = result;
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
    wiredSubTasks(result) {
        this.wiredSubTaskResult = result;
        const { error, data } = result;
        if (data) {
            this.subTasks = data.map(record => ({
                ...record,
                isOpen: false,
                sectionClass: 'slds-accordion__section',
                iconName: 'utility:chevronright',
                formattedDateInserted: this.formatDate(record.Date_Inserted__c),
                formattedDueDate: this.formatDate(record.Due_Date__c),
                Assigned_To_Name: '',
                Waiting_Period__c: this.calculateWaitingPeriod(record.Date_Inserted__c, record.Due_Date__c),
                Comments: record.Comments__c
            }));

            this.subTasks.sort((a, b) => {
                const dateA = new Date(a.Due_Date__c);
                const dateB = new Date(b.Due_Date__c);
                return dateA - dateB;
            });

            this.fetchSubTaskUserNames(this.subTasks);
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

    @wire(getRecord, { recordId: '$recordId', fields: [TASK_TEMPLATES_FIELD] })
    wiredTaskTemplates({ error, data }) {
        if (data) {
            const templateIds = getFieldValue(data, TASK_TEMPLATES_FIELD);
            if (templateIds) {
                this.fetchTemplates(templateIds);
            }
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading task templates',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        }
    }

    fetchTemplates(templateIds) {
        fetchFilesByIds({ itemIds: templateIds })
            .then(result => {
                console.log('Templates:', result);
    
                // Ensure the result is valid and map it to the appropriate format
                if (result && Array.isArray(result)) {
                    this.templates = result.map(file => ({
                        label: file.name || 'Unnamed File',
                        value: file.id
                    }));
                } else {
                    this.templates = [];
                }
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error fetching templates',
                        message: error.body.message,
                        variant: 'error',
                    })
                );
            });
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
    

    fetchSubTaskUserNames(subTasks) {
        const userIds = subTasks.map(record => record.Assigned_To__c).filter(userId => !!userId);
        if (userIds.length === 0) return;
    
        getUserNames({ userIds })
            .then(result => {
                this.subTasks = this.subTasks.map(subTask => {
                    return {
                        ...subTask,
                        Assigned_To_Name: result[subTask.Assigned_To__c] || subTask.Assigned_To__c
                    };
                });
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error fetching sub-task user names',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
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

    refreshTaskItems() {
        if (this.currentSubTaskId && !this.editTaskState || this.createSubTask){
            return refreshApex(this.wiredSubTaskResult);
        } else{
            return refreshApex(this.wiredTaskResult);
        }
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

    get isCritical() {
        return this.priority === 'Critical';
    }
    
    get isHigh() {
        return this.priority === 'High';
    }
    

    get modalHeader() {
        if (this.currentSubTaskId && !this.editTaskState) {
            return 'Edit sub-task';
        } else if (this.editTaskState) {
            return 'Edit task';
        } else {
            return 'Create a sub-task';
        }
    }

    get hasSubTasks() {
        return this.subTasks.length > 0;
    }

    handleTemplateChange(event) {
        // Set the selected template (document ID)
        this.selectedTemplate = event.detail.value;

        // Find the selected file in the templates list
        const selectedFile = this.templates.find(file => file.value === this.selectedTemplate);

        if (selectedFile) {
            // Extract the file name and remove the extension (assuming it's after the last dot)
            const fileNameWithoutExtension = selectedFile.label.split('.').slice(0, -1).join('.');

            // Convert the file name to uppercase and set it as the document type
            this.selectedDocumentType = fileNameWithoutExtension.toUpperCase();
        }

        // Prepare the flow input variables
        this.flowInputs = [
            {
                name: 'selectedDocumentId',
                type: 'String',
                value: this.selectedTemplate
            },
            {
                name: 'selectedDocumentType',
                type: 'String',
                value: this.selectedDocumentType
            }
        ];
    }

    handleProceedToGenerate() {
        this.isFlowModalOpen = true;
    }

    handleFlowStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            // Handle flow completion
            this.isFlowModalOpen = false;
        }
    }

    handleFlowClose() {
        // Close the flow modal
        this.isFlowModalOpen = false;
    }

    // Getter to determine if the Proceed button should be disabled
    get isProceedButtonDisabled() {
        return this.selectedTemplate === '';
    }

    get hasTemplates() {
        return this.templates && this.templates.length > 0;
    }

    onEditSubTask(event) {
        this.editSubTask = true;
        this.currentSubTaskId = event.currentTarget.dataset.id;

        if (!this.currentSubTaskId) {
            this.parentTaskId = this.recordId;
            this.createSubTask = true;
        } else{
            this.createSubTask = false; 
        }
    }

    onEditTask(event) {
        this.editSubTask = true;
        this.editTaskState = true;
        this.currentSubTaskId = event.currentTarget.dataset.id;
    }

    onEditTaskClose() {
        this.editSubTask = false;
        this.currentSubTaskId = null;
        this.editTaskState = false;
        this.createSubTask = false;
        this.parentTaskId = null;
    }

    onDeleteTask(event) {
        this.deleteTask = true;
        const taskId = event.currentTarget.dataset.id;
        if (taskId === this.recordId) {
            // This is the parent task
            this.isParentTask = true;
            this.currentSubTaskId = taskId;
        } else{
            // This is a sub-task
            this.currentSubTaskId = taskId;
        }
    }

    onDeleteTaskClose() {
        this.deleteTask = false;
        this.currentSubTaskId = null;
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
        this.isParentTask = true;
    }

    onCompleteTaskClose() {
        this.completeTask = false;
        this.isParentTask = false;
    }

    handleSave() {
        this.template.querySelector('c-task-manage-modal').handleSave();
    }

    handleSaveSuccess() {
        this.refreshTaskItems().then(() => {
            this.onEditTaskClose();
        });
    }
    
    handleDelete() {
        const deleteModal = this.template.querySelector('c-task-delete-modal');
        deleteModal.deleteRecord();
    }

    handleDeleteSuccess() {
        if (this.isParentTask === true) {
            this.dispatchEvent(new CustomEvent('taskdeleted'));
        } else if (this.taskDeleteMarkedComplete === true) {
            this.dispatchEvent(new CustomEvent('taskdeleted'));
        } else {
            this.refreshTaskItems().then(() => {
                this.onDeleteTaskClose();
            });
        }
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
                        title: 'Error',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }
}