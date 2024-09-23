import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord, getRecord } from 'lightning/uiRecordApi';
import { getRecordId } from 'c/sharedService';
import BV_TASK_OBJECT from '@salesforce/schema/BV_Task__c';
import NAME_FIELD from '@salesforce/schema/BV_Task__c.Name';
import COMMENTS_FIELD from '@salesforce/schema/BV_Task__c.Comments__c';
import CASE_OFFICER_FIELD from '@salesforce/schema/BV_Task__c.Assigned_To__c';
import PRIORITY_FIELD from '@salesforce/schema/BV_Task__c.Priority__c';
import DATE_INSERTED_FIELD from '@salesforce/schema/BV_Task__c.Date_Inserted__c';
import DUE_DATE_FIELD from '@salesforce/schema/BV_Task__c.Due_Date__c';
import LAST_UPDATED_FIELD from '@salesforce/schema/BV_Task__c.Last_updated__c';
import BV_CASE_LOOKUP_FIELD from '@salesforce/schema/BV_Task__c.BV_Case_Lookup__c';
import PARENT_TASK_FIELD from '@salesforce/schema/BV_Task__c.Parent_Task__c';
import WAITING_PERIOD_FIELD from '@salesforce/schema/BV_Task__c.Waiting_Period_Data__c';
import searchUsers from '@salesforce/apex/TaskController.searchUsers';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getCaseOwnerId from '@salesforce/apex/HistoryController.getCaseOwnerId';
import getTaskOwnerId from '@salesforce/apex/HistoryController.getTaskOwnerId';


const fields = [
    NAME_FIELD,
    COMMENTS_FIELD,
    CASE_OFFICER_FIELD,
    PRIORITY_FIELD,
    DATE_INSERTED_FIELD,
    DUE_DATE_FIELD,
    LAST_UPDATED_FIELD,
    WAITING_PERIOD_FIELD
];

export default class TaskManageModal extends LightningElement {
    @api recordId;
    @api parentTaskId;
    @track task = {};
    @track bvCaseId;
    @track caseOfficerOptions = [];
    @track caseOfficerValue = '';
    @track searchTerm = '';
    @track filteredCaseOfficerOptions = [];
    @track selectedCaseOfficerName = '';
    @track caseOfficerValue = '';
    @track parentTaskOwner = '';

    timeOptions = [
        { label: 'Working Days', value: 'Working Days' },
        { label: 'Days', value: 'Days' },
        { label: 'Weeks', value: 'Weeks' },
        { label: 'Months', value: 'Months' },
        { label: 'Years', value: 'Years' },
    ];

    beforeAfterOptions = [
        { label: 'Before', value: 'Before' },
        { label: 'After', value: 'After' },
    ];

    dateInsertedOptions = [
        { label: 'Date Inserted', value: 'Date Inserted' },
    ];

    priorityOptions = [
        { label: 'Normal', value: 'Normal' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' },
    ];

    // Waiting Period Fields
    @track waitingPeriodInputValue = '';
    @track waitingPeriodTimeValue = '';
    @track beforeAfterValue = '';
    @track dateInsertedSelected = '';

    connectedCallback() {
        if (!this.recordId) {
            this.bvCaseId = getRecordId();
            const currentDate = new Date().toISOString().split('T')[0];
            this.task.Date_Inserted__c = { value: currentDate };
            
            // Initialize waiting period fields
            this.waitingPeriodInputValue = 1;
            this.waitingPeriodTimeValue = 'Days';
            this.beforeAfterValue = 'After';
            this.dateInsertedSelected = 'Date Inserted';
        }
    
        if (this.bvCaseId) {
            this.fetchCaseOwner(this.bvCaseId);
        }
    
        if (this.parentTaskId) {
            this.fetchTaskOwner(this.parentTaskId); // Fetch task owner for sub-tasks
        } else if (this.recordId) {
            this.fetchTaskOwner(this.recordId); // Fetch task owner if editing an existing task
        }

        setTimeout(() => {
            if (this.task && this.task.Date_Inserted__c && this.task.Date_Inserted__c.value) {
                this.calculateDueDate();
            }
        }, 0);
    }    

    @wire(getRecord, { recordId: '$recordId', fields })
    wiredRecord({ error, data }) {
        if (data) {
            this.task = JSON.parse(JSON.stringify(data.fields));
            
            // Load case officer value
            this.caseOfficerValue = this.task.Assigned_To__c.value ? this.task.Assigned_To__c.value : '';
            if (this.caseOfficerValue) {
                this.fetchCaseOfficerName(this.caseOfficerValue);
            }
            
            // Check if there's data in the WAITING_PERIOD_FIELD
            if (this.task[WAITING_PERIOD_FIELD.fieldApiName] && this.task[WAITING_PERIOD_FIELD.fieldApiName].value) {
                const waitingPeriodData = JSON.parse(this.task[WAITING_PERIOD_FIELD.fieldApiName].value);
                this.waitingPeriodInputValue = waitingPeriodData.waitingPeriodInputValue || '';
                this.waitingPeriodTimeValue = waitingPeriodData.waitingPeriodTimeValue || '';
                this.beforeAfterValue = waitingPeriodData.beforeAfterValue || '';
                this.dateInsertedSelected = waitingPeriodData.dateInsertedSelected || '';
                
                // Populate fields with the loaded data
                this.updateInputFields();
            } else {
                // Fallback to auto-population if no waiting period data is found
                this.autoPopulateFields();
            }
        } else if (error) {
            this.error = error;
        }
    }

    @wire(getRecord, { recordId: '$parentTaskId', fields: [CASE_OFFICER_FIELD]})
    wiredParentTask({ error, data }) {
        if (data) {
            this.parentTaskOwner = data.fields.Assigned_To__c.value;
            this.caseOfficerValue = this.parentTaskOwner;
            this.fetchCaseOfficerName(this.caseOfficerValue);
        } else if (error) {
            console.error('Error fetching parent task owner:', error);
        }
    }

    refreshOwnerData() {
        if (this.bvCaseId) {
            refreshApex(this.bvCaseId).then(() => this.fetchCaseOwner(this.bvCaseId));
        }
    
        if (this.parentTaskId) {
            refreshApex(this.parentTaskId).then(() => this.fetchTaskOwner(this.parentTaskId));
        } else if (this.recordId) {
            refreshApex(this.recordId).then(() => this.fetchTaskOwner(this.recordId));
        }
    }    

    fetchCaseOwner(caseId) {
        getCaseOwnerId({ caseId })
            .then(ownerId => {
                this.caseOfficerValue = ownerId;
                this.fetchCaseOfficerName(this.caseOfficerValue);
            })
            .catch(error => {
                console.error('Error fetching case owner:', error);
            });
    }
    
    fetchTaskOwner(taskId) {
        getTaskOwnerId({ taskId })
            .then(ownerId => {
                this.caseOfficerValue = ownerId;
                this.fetchCaseOfficerName(this.caseOfficerValue);
            })
            .catch(error => {
                console.error('Error fetching task owner:', error);
            });
    }

    fetchCaseOfficerName(userId) {
        if (userId) {
            getUserNames({ userIds: [userId] })
                .then((result) => {
                    // Check if the userId exists in the result
                    if (result[userId]) {
                        this.selectedCaseOfficerName = result[userId];
                        this.searchTerm = this.selectedCaseOfficerName;
                    } else {
                        // If the userId is not found, it indicates the user is deactivated
                        this.selectedCaseOfficerName = 'Deactivated user';
                        this.searchTerm = this.selectedCaseOfficerName;
                    }
                })
                .catch((error) => {
                    console.error(error);
                    // Handle any unexpected errors, setting a default value
                    this.selectedCaseOfficerName = 'Deactivated user';
                    this.searchTerm = this.selectedCaseOfficerName;
                });
        } else {
            this.selectedCaseOfficerName = '';
            this.searchTerm = '';
        }
    }
    
    handleModalOpen() {
        this.refreshOwnerData();
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;

        // Capture the input changes for waiting period-related fields
        if (field === 'waitingPeriodInputValue') {
            this.waitingPeriodInputValue = event.target.value;
        } else if (field === 'waitingPeriodTimeValue') {
            this.waitingPeriodTimeValue = event.target.value;
        } else if (field === 'beforeAfterValue') {
            this.beforeAfterValue = event.target.value;
        } else if (field === 'dateInsertedSelected') {
            this.dateInsertedSelected = event.target.value;
        }

        if (!this.task[field]) {
            this.task[field] = { value: '' };
        }
        this.task[field].value = event.target.value;
    
        if (field === 'Date_Inserted__c' && !event.target.value) {
            return;
        }
    
        if (field === 'waitingPeriodInputValue' || field === 'waitingPeriodTimeValue' || field === 'beforeAfterValue' || field === 'dateInsertedSelected' || field === 'Date_Inserted__c') {
            this.calculateDueDate();
        }
    
        if (field === 'Date_Inserted__c' || field === 'Due_Date__c') {
            this.autoPopulateFields();
        }
    }
    

    handleSearchTermChange(event) {
        this.searchTerm = event.target.value;
        this.fetchUsers();
    }

    fetchUsers() {
        if (this.searchTerm.length > 2) {
            searchUsers({ searchTerm: this.searchTerm })
                .then((result) => {
                    this.caseOfficerOptions = result.map((user) => {
                        return { label: user.Name, value: user.Id };
                    });
                    this.filteredCaseOfficerOptions = [...this.caseOfficerOptions];
                })
                .catch((error) => {
                    console.error('Error fetching users:', error);
                });
        } else {
            this.filteredCaseOfficerOptions = [];
        }
    }

    selectCaseOfficer(event) {
        const selectedCaseOfficerValue = event.currentTarget.dataset.value;
        const selectedCaseOfficerName = event.currentTarget.dataset.label;
        this.caseOfficerValue = selectedCaseOfficerValue;
        this.selectedCaseOfficerName = selectedCaseOfficerName;
        this.filteredCaseOfficerOptions = [];
        this.searchTerm = selectedCaseOfficerName;
        this.task[CASE_OFFICER_FIELD.fieldApiName] = { value: this.caseOfficerValue };
    }    

    handleCaseOfficerChange(event) {
        this.caseOfficerValue = event.detail.value;
        this.task[CASE_OFFICER_FIELD.fieldApiName] = { value: this.caseOfficerValue };
    }

    autoPopulateFields() {
        const dateInserted = this.task.Date_Inserted__c ? new Date(this.task.Date_Inserted__c.value) : null;
        const dueDate = this.task.Due_Date__c ? new Date(this.task.Due_Date__c.value) : null;

        if (dateInserted && dueDate) {
            const isAfter = dueDate > dateInserted;
            this.beforeAfterValue = isAfter ? 'After' : 'Before';

            // Calculate the difference in days
            const dayDifference = Math.abs((dueDate - dateInserted) / (1000 * 3600 * 24)); // Difference in days

            // Always display the difference in days
            this.waitingPeriodTimeValue = 'Days';
            this.waitingPeriodInputValue = Math.round(dayDifference).toString();

            this.dateInsertedSelected = 'Date Inserted';

            // Update the input fields with the calculated values
            this.updateInputFields();
        }
    }

    updateInputFields() {
        const waitingPeriodInput = this.template.querySelector('[data-id="waiting-period-input"]');
        const waitingPeriodTime = this.template.querySelector('[data-id="waiting-period-time"]');
        const beforeAfter = this.template.querySelector('[data-id="before-after"]');
        const dateInsertedSelect = this.template.querySelector('[data-id="date-inserted-select"]');

        if (waitingPeriodInput) {
            waitingPeriodInput.value = this.waitingPeriodInputValue;
        }
        if (waitingPeriodTime) {
            waitingPeriodTime.value = this.waitingPeriodTimeValue;
        }
        if (beforeAfter) {
            beforeAfter.value = this.beforeAfterValue;
        }
        if (dateInsertedSelect) {
            dateInsertedSelect.value = this.dateInsertedSelected;
        }
    }

    calculateDueDate() {
        const dateInsertedStr = this.template.querySelector('[data-id="date-inserted"]').value;
        const dateInserted = dateInsertedStr ? new Date(dateInsertedStr) : null;

        if (!dateInserted) {
            return;
        }

        const waitingPeriodInputValue = parseInt(this.template.querySelector('[data-id="waiting-period-input"]').value, 10);
        const waitingPeriodTimeValue = this.template.querySelector('[data-id="waiting-period-time"]').value;
        const beforeAfterValue = this.template.querySelector('[data-id="before-after"]').value;

        if (isNaN(waitingPeriodInputValue) || waitingPeriodInputValue <= 0) {
            this.task.Due_Date__c = { value: '' };
            this.updateDueDateInput();
            return;
        }

        let dueDate = new Date(dateInserted);

        switch (waitingPeriodTimeValue) {
            case 'Working Days':
                dueDate = this.calculateWorkingDays(dateInserted, waitingPeriodInputValue, beforeAfterValue === 'After');
                break;
            case 'Days':
                dueDate.setDate(beforeAfterValue === 'After' ? dueDate.getDate() + waitingPeriodInputValue : dueDate.getDate() - waitingPeriodInputValue);
                break;
            case 'Weeks':
                dueDate.setDate(beforeAfterValue === 'After' ? dueDate.getDate() + waitingPeriodInputValue * 7 : dueDate.getDate() - waitingPeriodInputValue * 7);
                break;
            case 'Months':
                dueDate.setMonth(beforeAfterValue === 'After' ? dueDate.getMonth() + waitingPeriodInputValue : dueDate.getMonth() - waitingPeriodInputValue);
                break;
            case 'Years':
                dueDate.setFullYear(beforeAfterValue === 'After' ? dueDate.getFullYear() + waitingPeriodInputValue : dueDate.getFullYear() - waitingPeriodInputValue);
                break;
            default:
                break;
        }

        this.task.Due_Date__c = { value: dueDate.toISOString().split('T')[0] };
        this.updateDueDateInput();
    }

    calculateWorkingDays(startDate, numberOfDays, isAfter) {
        let currentDate = new Date(startDate);
        let dayCount = 0;
    
        while (dayCount < numberOfDays) {
            // Move the date forward or backward
            currentDate.setDate(isAfter ? currentDate.getDate() + 1 : currentDate.getDate() - 1);
    
            // Skip weekends (Saturday and Sunday)
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                dayCount++;
            }
        }
    
        return currentDate;
    }

    updateDueDateInput() {
        const dueDateInput = this.template.querySelector('[data-id="due-date"]');
        if (dueDateInput) {
            dueDateInput.value = this.task.Due_Date__c.value;
        } else {
            console.error('dueDateInput not found');
        }
    }

    handleCheckboxChange(event) {
        const field = event.target.dataset.field;
        if (!this.task[field]) {
            this.task[field] = { value: false };
        }
        this.task[field].value = event.target.checked;
    }

    @api
    handleSave() {
        // Check for task description (Name)
        if (!this.task.Name || !this.task.Name.value.trim()) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please enter a description of the task before saving.',
                    variant: 'error',
                }),
            );
            return;
        }

        // Check for due date
        if (!this.task.Due_Date__c || !this.task.Due_Date__c.value) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Please enter a due date before saving.',
                    variant: 'error',
                }),
            );
            return;
        }

        const waitingPeriodData = {
            waitingPeriodInputValue: this.waitingPeriodInputValue,
            waitingPeriodTimeValue: this.waitingPeriodTimeValue,
            beforeAfterValue: this.beforeAfterValue,
            dateInsertedSelected: this.dateInsertedSelected
        };

        console.log('waitingPeriodData:', waitingPeriodData);
        
        this.task[WAITING_PERIOD_FIELD.fieldApiName] = {
            value: JSON.stringify(waitingPeriodData)
        };
        
        if (this.recordId) {
            this.updateTask();
        } else {
            this.createTask();
        }
    }

    createTask() {
        const fields = {};
        for (let key in this.task) {
            if (key !== 'beforeAfterValue' && key !== 'waitingPeriodInputValue' && key !== 'waitingPeriodTimeValue' && key !== 'dateInsertedSelected') {
                fields[key] = this.task[key].value;
            }
        }
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString();
        fields[BV_CASE_LOOKUP_FIELD.fieldApiName] = this.bvCaseId;
        fields[CASE_OFFICER_FIELD.fieldApiName] = this.caseOfficerValue;
        if (this.parentTaskId) {
            fields[PARENT_TASK_FIELD.fieldApiName] = this.parentTaskId;
            fields[BV_CASE_LOOKUP_FIELD.fieldApiName] = null;
        }
        const recordInput = { apiName: BV_TASK_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(task => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task created successfully',
                        variant: 'success',
                    }),
                );
                this.recordId = task.id;
    
                const createdEvent = new CustomEvent('taskcreated', {
                    detail: {
                        taskId: this.recordId,
                    },
                });
                this.dispatchEvent(createdEvent);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating task',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
            });
    }
    
    updateTask() {
        const fields = {};
        for (let key in this.task) {
            if (key !== 'beforeAfterValue' && key !== 'waitingPeriodInputValue' && key !== 'waitingPeriodTimeValue' && key !== 'dateInsertedSelected') {
                fields[key] = this.task[key].value;
            }
        }
        fields.Id = this.recordId;
        fields[LAST_UPDATED_FIELD.fieldApiName] = new Date().toISOString();
        fields[CASE_OFFICER_FIELD.fieldApiName] = this.caseOfficerValue; // Add this line
        const recordInput = { fields };
    
        updateRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Task updated successfully',
                        variant: 'success',
                    }),
                );
                const updatedEvent = new CustomEvent('taskupdated', {
                    detail: { taskId: this.recordId },
                    bubbles: true, // Allow the event to bubble up
                    composed: true // Allow the event to cross the shadow DOM boundary
                });
                this.dispatchEvent(updatedEvent);
                console.log('updatedEvent', updatedEvent);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating task',
                        message: error.body.message,
                        variant: 'error',
                    }),
                );
            });
    }
    

    get nameValue() {
        return this.task.Name ? this.task.Name.value : '';
    }

    get descriptionValue() {
        return this.task.Description__c ? this.task.Description__c.value : '';
    }

    get commentsValue() {
        return this.task.Comments__c ? this.task.Comments__c.value : '';
    }

    get dueDateValue() {
        return this.task.Due_Date__c ? this.task.Due_Date__c.value : '';
    }

    get dateInsertedValue() {
        return this.task.Date_Inserted__c ? this.task.Date_Inserted__c.value : new Date().toISOString().split('T')[0];
    }
    
    
    get priorityValue() {
        return this.task.Priority__c ? this.task.Priority__c.value : '';
    }

    get scheduleCodeValue() {
        return this.task.Schedule_Code__c ? this.task.Schedule_Code__c.value : '';
    }

    get caseOfficerValue() {
        return this.task.Assigned_To__c ? this.task.Assigned_To__c.value : '';
    }    

    get categoryValue() {
        return this.task.Category__c ? this.task.Category__c.value : '';
    }

    get shouldShowDropdown() {
        return this.searchTerm && this.searchTerm.length > 2 && this.filteredCaseOfficerOptions.length > 0;
    }
}