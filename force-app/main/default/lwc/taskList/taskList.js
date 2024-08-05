import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getTasksByCaseId from '@salesforce/apex/TaskController.getTasksByCaseId';
import getOpenTasksByUser from '@salesforce/apex/TaskController.getOpenTasksByUser';
import getOtherTasksByCaseId from '@salesforce/apex/TaskController.getOtherTasksByCaseId';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getCurrentUserId from '@salesforce/apex/HistoryController.getCurrentUserId';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecordId } from 'c/sharedService';

export default class TaskList extends LightningElement {
    @api recordId;
    @track taskItems = [];
    @track filteredTaskItems = [];
    @track isModalOpen = false;
    @track isDeleteModalOpen = false;
    @track currentRecordId;
    @track lastUpdated = 0;
    @track currentRecord = {};
    @track searchKey = '';
    @track sortOrder = 'asc';
    @track sortOrderIcon = 'utility:arrowup';
    @track sortedBy = 'Due_Date__c';
    @track selectedTaskType = 'allTasks';  // Default selection
    @track currentUserId;  // To store the current user's ID
    @track isTaskDetailVisible = false;
    wiredTaskItemsResult;
    userNames = {};

    taskTypeOptions = [
        { label: 'All tasks', value: 'allTasks' },
        { label: 'My tasks', value: 'myTasks' },
        { label: 'Others tasks', value: 'othersTasks' }
    ];

    sortLabels = {
        'Due__c': 'Due',
        'Description__c': 'Description',
        'Priority__c': 'Priority',
        'Case_Officer_Name__c': 'Case Officer',
        'Due_Date__c' : 'Due Date'
    };

    connectedCallback() {
        this.recordId = getRecordId();
        this.fetchCurrentUserId();
        this.refreshTaskItems();
    }

    fetchCurrentUserId() {
        getCurrentUserId()
            .then(result => {
                this.currentUserId = result;
                this.filterTaskItems();
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching current user ID', 'error');
            });
    }

    @wire(getTasksByCaseId, { caseId: '$recordId' })
    wiredTaskItems(result) {
        this.wiredTaskItemsResult = result;
        if (result.data && this.recordId) {
            this.processTaskItems(result.data);
        } else if (result.error) {
            this.showToast('Error', 'Error fetching task items', 'error');
        }
    }

    @wire(getOpenTasksByUser, { userId: '$currentUserId' })
    wiredOpenTasks(result) {
        if (this.selectedTaskType === 'myOpenTasks' && result.data) {
            this.processTaskItems(result.data);
        } else if (result.error) {
            this.showToast('Error', 'Error fetching open tasks', 'error');
        }
    }

    @wire(getOtherTasksByCaseId, { caseId: '$recordId', userId: '$currentUserId' })
    wiredOtherTasks(result) {
        if (this.selectedTaskType === 'othersTasks' && result.data) {
            this.processTaskItems(result.data);
        } else if (result.error) {
            this.showToast('Error', 'Error fetching other tasks', 'error');
        }
    }

    processTaskItems(data) {
        this.taskItems = data.map(item => ({
            ...item,
            isExpanded: false,
            hasSubTasks: item.BV_Tasks1__r && item.BV_Tasks1__r.length > 0,
            iconName: this.getIconName(false),
            rowClass: this.getRowClass(item),
            flagIconClass: item.Flag_as_important__c ? 'icon-important' : 'icon-default',
            SubTasks: item.BV_Tasks1__r ? item.BV_Tasks1__r
                .map(subTask => ({
                    ...subTask,
                    rowClass: this.getRowClass(subTask),
                    isCritical: subTask.Priority__c === 'Critical',
                    isHigh: subTask.Priority__c === 'High',
                    Due_Date__c: subTask.Due_Date__c,
                    Case_Officer_Name: this.userNames[subTask.Assigned_To__c] || subTask.Assigned_To__c,
                    Description__c: subTask.Description__c || subTask.Name // Ensure Description__c is set
                }))
                .sort((a, b) => new Date(a.Due_Date__c) - new Date(b.Due_Date__c)) : [],  // Sort by Due_Date__c
            isCritical: item.Priority__c === 'Critical',
            isHigh: item.Priority__c === 'High',
            Description__c: item.Description__c || item.Name // Ensure Description__c is set
        }));
    
        // Collect all user IDs from both tasks and sub-tasks
        const userIds = this.taskItems.reduce((ids, item) => {
            ids.add(item.Assigned_To__c);
            if (item.SubTasks) {
                item.SubTasks.forEach(subTask => ids.add(subTask.Assigned_To__c));
            }
            return ids;
        }, new Set());
    
        this.fetchUserNames([...userIds]);
        this.updateLastUpdated();
        this.assignNumbers();
        this.filterTaskItems();
        this.sortTaskItems();
    }
    

    fetchUserNames(userIds) {
        getUserNames({ userIds })
            .then(result => {
                this.userNames = result;
    
                // Update Case_Officer_Name for both main tasks and sub-tasks
                this.taskItems = this.taskItems.map(item => {
                    item.Case_Officer_Name = this.userNames[item.Assigned_To__c] || item.Assigned_To__c;
                    if (item.SubTasks) {
                        item.SubTasks = item.SubTasks.map(subTask => ({
                            ...subTask,
                            Case_Officer_Name: this.userNames[subTask.Assigned_To__c] || subTask.Assigned_To__c
                        }));
                    }
                    return item;
                });
    
                this.assignNumbers();
                this.filterTaskItems();
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching user names', 'error');
            });
    }    

    refreshTaskItems() {
        if (this.selectedTaskType === 'myTasks') {
            refreshApex(this.wiredTaskItemsResult);
        } else if (this.selectedTaskType === 'othersTasks') {
            refreshApex(this.wiredTaskItemsResult);
        } else {
            refreshApex(this.wiredTaskItemsResult);
        }
    }

    updateLastUpdated() {
        if (this.taskItems.length > 0) {
            const latestItem = this.taskItems.reduce((latest, item) => {
                const itemDate = new Date(item.Last_updated__c);
                return itemDate > new Date(latest.Last_updated__c) ? item : latest;
            }, this.taskItems[0]);
            const now = new Date();
            const lastUpdateTime = new Date(latestItem.Last_updated__c);
            const diffInMinutes = Math.floor((now - lastUpdateTime) / 60000);
    
            if (diffInMinutes < 60) {
                this.lastUpdated = `${diffInMinutes} minutes ago`;
            } else if (diffInMinutes < 1440) {
                const diffInHours = Math.floor(diffInMinutes / 60);
                this.lastUpdated = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
            } else {
                const diffInDays = Math.floor(diffInMinutes / 1440);
                this.lastUpdated = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
            }
        }
    }
    

    getIconName(isExpanded) {
        return isExpanded ? "utility:chevrondown" : "utility:chevronright";
    }

    toggleRow(event) {
        event.stopPropagation();  // Stop the event from propagating to the row click handler
        const itemId = event.currentTarget.dataset.id;
        this.taskItems = this.taskItems.map(item => {
            if (item.Id === itemId) {
                item.isExpanded = !item.isExpanded;
                item.iconName = this.getIconName(item.isExpanded);
            }
            return item;
        });
        this.assignNumbers();
        this.filterTaskItems();
    }

    handleAddTask() {
        this.currentRecordId = null;
        this.currentRecord = {};
        this.isModalOpen = true;
    }

    handleViewEdit(event) {
        event.stopPropagation();  // Stop the event from propagating to the row click handler
        this.currentRecordId = event.currentTarget.dataset.id;
        const record = this.taskItems.find(item => item.Id === this.currentRecordId);
        this.currentRecord = { ...record };
    
        // Redirect to the task detail page instead of opening the edit modal
        this.isTaskDetailVisible = true;
    }

    handleDeleteOpen(event) {
        event.stopPropagation();  // Stop the event from propagating to the row click handler
        this.currentRecordId = event.currentTarget.dataset.id;
        const record = this.taskItems.find(item => item.Id === this.currentRecordId);
        this.currentRecord = { ...record };
        this.isDeleteModalOpen = true;
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    handleDelete() {
        const deleteModal = this.template.querySelector('c-task-delete-modal');
        deleteModal.deleteRecord();
    }

    closeModal() {
        this.isModalOpen = false;
    }

    closeDeleteModal() {
        this.isDeleteModalOpen = false;
    }

    handleDeleteSuccess() {
        this.isDeleteModalOpen = false;
        this.showToast('Success', 'Record deleted successfully', 'success');
        this.refreshTaskItems();
    }

    handleSave() {
        this.template.querySelector('c-task-manage-modal').handleSave();
    }

    handleSaveSuccess() {
        this.isModalOpen = false;
        this.refreshTaskItems();
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    handleSearchInputChange(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.filterTaskItems();
    }

    handleSort(event) {
        const column = event.currentTarget.dataset.column;
        this.sortOrder = (this.sortedBy === column && this.sortOrder === 'asc') ? 'desc' : 'asc';
        this.sortOrderIcon = this.sortOrder === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
        this.sortedBy = column;
        this.sortTaskItems();
    }

    sortTaskItems() {
        this.taskItems.sort((a, b) => {
            let valA, valB;
    
            if (this.sortedBy === 'Case_Officer_Name__c') {
                valA = this.userNames[a.Assigned_To__c]?.toLowerCase() || '';
                valB = this.userNames[b.Assigned_To__c]?.toLowerCase() || '';
            } else if (this.sortedBy === 'Description__c') {
                valA = a.Description__c ? a.Description__c.toLowerCase() : '';
                valB = b.Description__c ? b.Description__c.toLowerCase() : '';
            } else {
                valA = a[this.sortedBy] ? a[this.sortedBy].toLowerCase() : '';
                valB = b[this.sortedBy] ? b[this.sortedBy].toLowerCase() : '';
            }
    
            if (valA === '' || valA === null || valA === undefined) return 1;
            if (valB === '' || valB === null || valB === undefined) return -1;
    
            if (valA < valB) {
                return this.sortOrder === 'asc' ? -1 : 1;
            } else if (valA > valB) {
                return this.sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
        this.assignNumbers();
        this.filterTaskItems();
    }
    
    filterTaskItems() {
        this.assignNumbers();
        this.filteredTaskItems = this.taskItems.filter(item => {
            const searchKeyLower = this.searchKey.toLowerCase();
            const searchMatch = this.searchKey ? (
                (item.Name?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Description__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Priority__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
            ) : true;
    
            const subTaskMatch = this.searchKey && item.SubTasks ? item.SubTasks.some(subTask =>
                (subTask.Name?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (subTask.Description__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (subTask.Priority__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (subTask.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
            ) : false;
    
            const taskTypeMatch = this.selectedTaskType === 'allTasks' ||
                (this.selectedTaskType === 'myTasks' && 
                    (item.Assigned_To__c === this.currentUserId || 
                    item.SubTasks.some(subTask => subTask.Assigned_To__c === this.currentUserId))) ||
                (this.selectedTaskType === 'othersTasks' && 
                    (item.Assigned_To__c !== this.currentUserId || 
                    item.SubTasks.some(subTask => subTask.Assigned_To__c !== this.currentUserId)));
    
            return (searchMatch || subTaskMatch) && taskTypeMatch;
        });
    
        // Filter sub-tasks based on the selected task type
        this.filteredTaskItems = this.filteredTaskItems.map(item => {
            if (this.selectedTaskType === 'myTasks') {
                return {
                    ...item,
                    SubTasks: item.SubTasks.filter(subTask => subTask.Assigned_To__c === this.currentUserId)
                };
            } else if (this.selectedTaskType === 'othersTasks') {
                return {
                    ...item,
                    SubTasks: item.SubTasks.filter(subTask => subTask.Assigned_To__c !== this.currentUserId)
                };
            }
            return item;
        });
    }
    
    handleTaskTypeChange(event) {
        this.selectedTaskType = event.detail.value;
        this.refreshTaskItems();
        this.filterTaskItems();
    }

    handleClearSearch() {
        this.searchKey = '';
        this.filterTaskItems();
        const searchInput = this.template.querySelector('lightning-input');
        if (searchInput) {
            searchInput.value = '';
        }
    }
    
    handleRowDoubleClick(event) {
        const clickedId = event.currentTarget.dataset.id;
        let mainTaskId = clickedId;
    
        // Find the main task if the clicked item is a sub-task
        this.taskItems.forEach(task => {
            if (task.SubTasks) {
                task.SubTasks.forEach(subTask => {
                    if (subTask.Id === clickedId) {
                        mainTaskId = task.Id;
                    }
                });
            }
        });
    
        this.currentRecordId = mainTaskId;
        this.isTaskDetailVisible = true;
    }

    handleTaskDetailClose() {
        this.isTaskDetailVisible = false;
        this.refreshTaskItems();
    }

    assignNumbers() {
        let counter = 1;
        this.taskItems = this.taskItems.map((item) => {
            // Shallow copy of the task item to ensure it's extensible
            let newItem = { ...item };
            const mainTaskNumber = counter;
            let subCounter = 1;
            newItem.number = mainTaskNumber.toString();
            
            if (newItem.hasSubTasks) {
                // Shallow copy of the sub-tasks to ensure they are extensible
                newItem.SubTasks = newItem.SubTasks.map((subTask) => {
                    let newSubTask = { ...subTask };
                    newSubTask.number = `${mainTaskNumber}.${subCounter}`;
                    subCounter++;
                    return newSubTask;
                });
            }
            counter++;
            return newItem;
        });
    }

    get sortedByText() {
        const displaySortedBy = this.sortLabels[this.sortedBy] || this.sortedBy;
        const sortOrderText = this.sortOrder === 'asc' ? '(ascending)' : '(descending)';
        return `Sorted by ${displaySortedBy} ${sortOrderText} - Filtered by ${this.selectedTaskType === 'allTasks' ? 'All tasks' : this.selectedTaskType === 'myTasks' ? 'My tasks' : 'Others tasks'}`;
    }
    

    get isSortedByDue() {
        return this.sortedBy === 'Due_Date__c';
    }

    get isSortedByDescription() {
        return this.sortedBy === 'Description__c';
    }

    get isSortedByPriority() {
        return this.sortedBy === 'Priority__c';
    }

    get isSortedByCaseOfficer() {
        return this.sortedBy === 'Case_Officer_Name__c';
    }

    getRowClass(item) {
        if (item.Priority__c === 'Critical') {
            return 'slds-hint-parent critical-priority';
        } else if (item.Priority__c === 'High') {
            return 'slds-hint-parent high-priority';
        }
        return 'slds-hint-parent normal-priority';
    }
}