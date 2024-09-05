import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getHistoryItems from '@salesforce/apex/HistoryController.getHistoryItems';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import getCurrentUserId from '@salesforce/apex/HistoryController.getCurrentUserId';
import getSHDocuments from '@salesforce/apex/HistoryController.getSHDocuments';
import getSharePointSettings from '@salesforce/apex/FileControllerGraph.getSharePointSettings';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecordId } from 'c/sharedService';
import { NavigationMixin } from 'lightning/navigation';
import groupHistoryRecords from '@salesforce/apex/HistoryController.groupHistoryRecords';
import ungroupHistoryRecords from '@salesforce/apex/HistoryController.ungroupHistoryRecords';
import updateParentHistoryRecords from '@salesforce/apex/HistoryController.updateParentHistoryRecords';
import swapParentChildIfNecessary from '@salesforce/apex/HistoryController.swapParentChildIfNecessary';


export default class HistoryList extends NavigationMixin(LightningElement) {
    @api recordId;
    @track historyItems = [];
    @track filteredHistoryItems = [];
    @track isModalOpen = false;
    @track isDeleteModalOpen = false;
    @track currentRecordId;
    @track showRelatedItems = false;
    @track lastUpdated = 0;
    @track currentRecord = {};
    @track searchKey = '';
    @track dateFrom = null;
    @track dateTo = null;
    @track sortOrder = 'asc';
    @track sortOrderIcon = 'utility:arrowup';
    @track sortedBy = 'Date_Inserted__c';
    @track selectedHistoryType = 'allHistory';  // Default selection
    @track currentUserId;  // To store the current user's ID
    @track selectedRecordDetails = '';
    @track sharePointSiteUrl;
    @track sharePointDirectoryPath;
    @track sortedByPriority = false;
    @track previousHistoryItems = [];
    @track isUngroupDisabled = true;
    @track isGroupDisabled = true;
    @track expandedItems = new Map();
    @track newCase = true;

    wiredHistoryItemsResult;
    userNames = {};

    historyTypeOptions = [
        { label: 'All history', value: 'allHistory' },
        { label: 'My history', value: 'myHistory' }
    ];

    connectedCallback() {
        this.recordId = getRecordId();
        this.fetchCurrentUserId();
        this.refreshHistoryItems();
        this.fetchSharePointSettings();
    }

    fetchCurrentUserId() {
        getCurrentUserId()
            .then(result => {
                this.currentUserId = result;
                this.filterHistoryItems();
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching current user ID', 'error');
            });
    }

    fetchSharePointSettings() {
        getSharePointSettings()
            .then(settings => {
                this.sharePointSiteUrl = settings.SharePoint_Site_URL;
                this.sharePointDirectoryPath = settings.SharePoint_Directory_Path;
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error fetching SharePoint settings:', error);
            });
    }

    @wire(getHistoryItems, { recordId: '$recordId' })
    wiredHistoryItems(result) {
        this.wiredHistoryItemsResult = result;
        if (result.data) {
            const recordsMap = {};

            // Map history items and handle parent-child relationships
            this.historyItems = result.data.map(item => {
                const history = item.history || {};
                const emailMessage = item.EmailMessage || {};

                const mergedRecord = {
                    ...history,
                    Id: history.Id || '',
                    BV_Case__c: history.BV_Case__c || '',
                    Date_Inserted__c: history.Date_Inserted__c || '',
                    Details__c: history.Details__c || '',
                    Action__c: history.Action__c || '',
                    Case_Officer__c: history.Case_Officer__c || '',
                    Flag_as_important__c: history.Flag_as_important__c || false,
                    Last_updated__c: history.Last_updated__c || '',
                    isExpanded: false,
                    iconName: this.getIconName(false),
                    rowClass: history.Flag_as_important__c ? 'highlighted-row' : '',
                    flagIconClass: history.Flag_as_important__c ? 'icon-important' : 'icon-default',
                    notes: history.Details__c ? 'Has details' : '',
                    hasDetails: !!history.Details__c,
                    emailMessageId: emailMessage.Id || '',
                    emailMessageSubject: emailMessage.Subject || '',
                    emailMessageFrom: emailMessage.FromAddress || '',
                    emailMessageTo: emailMessage.ToAddress || '',
                    emailMessageCc: emailMessage.CcAddress || '',
                    emailMessageBcc: emailMessage.BccAddress || '',
                    emailMessageStatus: emailMessage.Status || '',
                    Case_Officer_Name: this.userNames[history.Case_Officer__c] || history.Case_Officer__c,
                    isChild: !!history.Parent_History_Record__c,
                    parentId: history.Parent_History_Record__c || null,
                    isSelected: false,
                    children: [],
                    hasChildren: history.Case_History__r && history.Case_History__r.length > 0
                };

                recordsMap[history.Id] = mergedRecord;

                // Attach child records directly to the parent record
                if (mergedRecord.hasChildren) {
                    mergedRecord.children = history.Case_History__r
                        .map(childRecord => {
                            const childMergedRecord = {
                                ...childRecord,
                                Id: childRecord.Id || '',
                                BV_Case__c: childRecord.BV_Case__c || '',
                                Date_Inserted__c: childRecord.Date_Inserted__c || '',
                                Details__c: childRecord.Details__c || '',
                                Action__c: childRecord.Action__c || '',
                                Case_Officer__c: childRecord.Case_Officer__c || '',
                                Flag_as_important__c: childRecord.Flag_as_important__c || false,
                                Last_updated__c: childRecord.Last_updated__c || '',
                                isExpanded: false,
                                iconName: this.getIconName(false),
                                rowClass: childRecord.Flag_as_important__c ? 'highlighted-row' : '',
                                flagIconClass: childRecord.Flag_as_important__c ? 'icon-important' : 'icon-default',
                                notes: childRecord.Details__c ? 'Has details' : '',
                                hasDetails: !!childRecord.Details__c,
                                Case_Officer_Name: this.userNames[childRecord.Case_Officer__c] || childRecord.Case_Officer__c,
                                isChild: true,
                                parentId: mergedRecord.Id,
                                isSelected: false,
                                children: [], // Ensure this is empty for child records
                                hasChildren: false
                            };
                            recordsMap[childRecord.Id] = childMergedRecord;
                            return childMergedRecord; // Return the actual child record, not null
                        })
                        .sort((a, b) => new Date(a.Date_Inserted__c) - new Date(b.Date_Inserted__c)); // Sort by Date_Inserted__c ascending
                }                

                return mergedRecord;
            });

            // Ensure all children are correctly mapped to their parents
            this.historyItems.forEach(item => {
                if (item.isChild && item.parentId) {
                    const parentRecord = recordsMap[item.parentId];
                    if (parentRecord) {
                        parentRecord.children.push(item);
                    }
                }
            });

            const userIds = this.historyItems.map(item => item.Case_Officer__c);
            const isDeletion = this.previousHistoryItems.length > 0 && this.historyItems.length < this.previousHistoryItems.length;
            this.fetchUserNames(userIds);
            this.updateLastUpdated(isDeletion);
            this.previousHistoryItems = [...this.historyItems];

            this.sortHistoryItems();
            this.filterHistoryItems();
        } else if (result.error) {
            this.showToast('Error', 'Error fetching history items', 'error');
        }
    }

    fetchUserNames(userIds) {
        const validUserIds = userIds.filter(id => id && id.length === 18);

        if (validUserIds.length > 0) {
            getUserNames({ userIds: validUserIds })
                .then(result => {
                    this.userNames = result;
                    this.historyItems = this.historyItems.map(item => ({
                        ...item,
                        Case_Officer_Name: this.userNames[item.Case_Officer__c] || item.Case_Officer__c,
                        children: item.children.map(child => ({
                            ...child,
                            Case_Officer_Name: this.userNames[child.Case_Officer__c] || child.Case_Officer__c
                        }))
                    }));
                    this.sortHistoryItems();
                })
                .catch(error => {
                    this.showToast('Error', 'Error fetching user names', 'error');
                });
        } else {
            this.sortHistoryItems();
        }
    }

    refreshHistoryItems() {
        refreshApex(this.wiredHistoryItemsResult);
        this.resetCheckboxStates();
    }

    updateLastUpdated(isDeletion = false) {
        const now = new Date();
    
        if (this.historyItems.length > 0) {
            const validItems = this.historyItems.filter(item => item.Last_updated__c);
            
            if (validItems.length === 0) {
                this.lastUpdated = 'No updates available';
                return;
            }
    
            const latestItem = validItems.reduce((latest, item) => {
                const itemDate = new Date(item.Last_updated__c);
                return itemDate > new Date(latest.Last_updated__c) ? item : latest;
            }, validItems[0]);
    
            let lastUpdateTime;
            if (isDeletion) {
                lastUpdateTime = now; // If a deletion occurred, consider now as the last update time
            } else {
                lastUpdateTime = new Date(latestItem.Last_updated__c);
            }
    
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
        } else if(this.newCase){
            this.lastUpdated = 'No updates available';
            return;
        } else {
            // If all items are deleted or historyItems is empty, calculate the time difference from the last action (which is now)
            const diffInMinutes = Math.floor((now - this.lastActionTime) / 60000);
    
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
    
        // Store the time of the last action
        this.lastActionTime = now;
    }
    

    getIconName(isExpanded) {
        return isExpanded ? "utility:chevrondown" : "utility:chevronright";
    }

    toggleRow(event) {
        const itemId = event.currentTarget.dataset.id;
        this.historyItems = this.historyItems.map(item => {
            if (item.Id === itemId) {
                item.isExpanded = !item.isExpanded;
                item.iconName = this.getIconName(item.isExpanded);

                if (item.isExpanded) {
                    this.expandedItems.set(item.Id, true);
                } else {
                    this.expandedItems.delete(item.Id);

                    item.children = item.children.map(child => ({
                        ...child,
                        isSelected: false
                    }));
                }
            }
            return item;
        });
        this.filterHistoryItems();
    }


    handleAdd() {
        // this.deselectAllItems();
        // this.refreshHistoryItems();
        this.currentRecordId = null;
        this.currentRecord = {};
        this.isModalOpen = true;
    }

    handleViewEdit(event) {
        // this.deselectAllItems();
        // this.refreshHistoryItems();
        this.currentRecordId = event.currentTarget.dataset.id;
        let record = this.historyItems.find(item => item.Id === this.currentRecordId);
    
        if (!record) {
            this.historyItems.forEach(item => {
                const childRecord = item.children.find(child => child.Id === this.currentRecordId);
                if (childRecord) {
                    record = childRecord;
                }
            });
        }
    
        this.currentRecord = { ...record };
    
        getSHDocuments({ parentId: this.currentRecordId })
            .then(result => {
                if (result.length > 0) {
                    const shDocument = result[0];
                    this.currentRecord.fileName = shDocument.Name;
                    this.currentRecord.fileSize = shDocument.FileSize__c ? shDocument.FileSize__c : 0;
                    this.currentRecord.fileData = shDocument.FileContent__c;
                    this.currentRecord.documentType = shDocument.DocumentType__c;
                    this.currentRecord.draft = shDocument.Draft__c;
                    this.currentRecord.serverRelativeURL = shDocument.ServerRelativeURL__c;
                    this.currentRecord.documentId = shDocument.Id;
                }
                this.isModalOpen = true;
            })
            .catch(error => {
                this.showToast('Error', 'Error fetching documents', 'error');
            });
    }

    handleOpenInSharePoint(event) {
        const serverRelativeURL = event.currentTarget.dataset.url;

        let url = serverRelativeURL.startsWith('http') ? serverRelativeURL : `${this.sharePointSiteUrl}/${serverRelativeURL}`;

        if (url) {
            window.open(url, '_blank');
        } else {
            this.showToast('Error', 'No URL found for this item.', 'error');
        }
    }

    handleDeleteOpen(event) {
        // this.deselectAllItems();
        // this.refreshHistoryItems();
        this.currentRecordId = event.currentTarget.dataset.id;
        let record = this.historyItems.find(item => item.Id === this.currentRecordId);
    
        if (!record) {
            this.historyItems.forEach(parentItem => {
                if (parentItem.children && parentItem.children.length > 0) {
                    const childRecord = parentItem.children.find(child => child.Id === this.currentRecordId);
                    if (childRecord) {
                        record = childRecord;
                    }
                }
            });
        }
    
        if (record) {
            this.currentRecord = { ...record };
        } else {
            console.error('Record not found for ID:', this.currentRecordId);
        }
    
        this.isDeleteModalOpen = true;
    }
    

    handleDelete() {
        const deleteModal = this.template.querySelector('c-history-delete-modal');
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

        this.historyItems = this.historyItems.map(item => {
            if (item.Id === this.currentRecordId || item.children.some(child => child.Id === this.currentRecordId)) {
                item.isSelected = false;
                item.children.forEach(child => child.isSelected = false);
            }
            return item;
        });
    
        // Check if the deleted record had children
        const deletedRecord = this.historyItems.find(item => item.Id === this.currentRecordId);
        if (deletedRecord && deletedRecord.children.length > 0) {
            // If there are children, find the oldest child to be the new parent
            const oldestChild = deletedRecord.children.reduce((oldest, child) => {
                return new Date(child.Date_Inserted__c) < new Date(oldest.Date_Inserted__c) ? child : oldest;
            }, deletedRecord.children[0]);
    
            const remainingChildrenIds = deletedRecord.children
                .filter(child => child.Id !== oldestChild.Id)
                .map(child => child.Id);
    
            // Make the oldest child the new parent
            ungroupHistoryRecords({ recordIds: [oldestChild.Id] })
                .then(() => {
                    if (remainingChildrenIds.length > 0) {
                        // Group the remaining children under the oldest child
                        groupHistoryRecords({
                            parentRecordId: oldestChild.Id,
                            childRecordIds: remainingChildrenIds
                        })
                        .then(() => {
                            this.showToast('Success', 'Oldest child reassigned as new parent.', 'success');
                            this.refreshHistoryItems();
                        })
                        .catch(error => {
                            console.error('Error reassigning new parent:', error);
                            this.showToast('Error', 'Error reassigning new parent: ' + this.getErrorMessage(error), 'error');
                        });
                    } else {
                        this.refreshHistoryItems();
                    }
                })
                .catch(error => {
                    console.error('Error ungrouping record:', error);
                    this.showToast('Error', 'Error ungrouping record: ' + this.getErrorMessage(error), 'error');
                });
        } else {
            // If there were no children, just refresh the items
            this.refreshHistoryItems();
        }
    }    
    

    handleSave() {
        this.template.querySelector('c-history-edit-modal').saveRecord(this.recordId);
    }

    handleSaveSuccess(event) {
        this.isModalOpen = false;
        this.showToast('Success', 'Record saved successfully', 'success');

        if(this.newCase = true){
            this.newCase = false;
        }

        if(this.currentRecordId) {
            const { recordId, dateInserted, isParent } = event.detail;

            // Find the original record in the historyItems or its children
            let originalRecord = this.historyItems.find(item => item.Id === recordId);
        
            if (!originalRecord) {
                // If the record is not a parent, search through children
                this.historyItems.forEach(item => {
                    const childRecord = item.children.find(child => child.Id === recordId);
                    if (childRecord) {
                        originalRecord = childRecord;
                    }
                });
            }
        
            // Proceed only if the original record is found
            if (originalRecord) {
                originalRecord.isSelected = false;
                originalRecord.children.forEach(child => child.isSelected = false);
                // Only call swapParentChildIfNecessary if the date has changed and the record is in a group
                if (originalRecord.Date_Inserted__c !== dateInserted &&
                    (originalRecord.Parent_History_Record__c || (originalRecord.children && originalRecord.children.length > 0))) {
        
                    swapParentChildIfNecessary({
                        recordId: recordId,
                        newDate: dateInserted, // Use the updated date from the event
                        isParent: !!originalRecord.children.length // Check if it's a parent based on children
                    })
                    .then((newParentId) => {
                        // Ensure the new parent is expanded
                        this.expandedItems.set(newParentId, true);
                        this.showToast('Success', 'Record hierarchy updated successfully.', 'success');
                        this.refreshHistoryItems(); // Refresh the history items after potential hierarchy change
                    })
                    .catch(error => {
                        this.showToast('Error', 'Error updating record hierarchy: ' + error.body.message, 'error');
                    });
                } else {
                    this.refreshHistoryItems(); // Just refresh history items if no swap is necessary
                }
            } else {
                this.refreshHistoryItems(); // Just refresh history items if no record was found
            }
        }else{
            this.refreshHistoryItems();
        }
    }
    
    

    toggleShowRelatedItems(event) {
        this.showRelatedItems = event.target.checked;
    
        if (!this.showRelatedItems) {
            // Unselect all records when the Group by related is unticked
            this.historyItems = this.historyItems.map(item => ({
                ...item,
                isExpanded: false,
                iconName: this.getIconName(false),
                isSelected: false, // Unselect parent item
                children: item.children.map(child => ({
                    ...child,
                    isSelected: false // Unselect child items
                }))
            }));
    
            // Flatten and sort all items, treating parents and children equally
            let flattenedItems = this.historyItems.flatMap(item => [item, ...item.children]);
    
            flattenedItems.sort((a, b) => {
                const dateA = new Date(a.Date_Inserted__c);
                const dateB = new Date(b.Date_Inserted__c);
    
                if (dateA < dateB) {
                    return this.sortOrder === 'asc' ? -1 : 1;
                } else if (dateA > dateB) {
                    return this.sortOrder === 'asc' ? 1 : -1;
                }
                return 0;
            });
    
            // Assign the sorted flat list to filteredHistoryItems for rendering
            this.filteredHistoryItems = flattenedItems.map(item => ({
                ...item,
                isChild: false, // Treat all as independent records for rendering
                children: [] // Clear children since we're not grouping
            }));
        } else {
            // Handle the case when grouping is enabled
            this.sortHistoryItems(); // Sort the history items after toggling the related items
            this.filterHistoryItems(); // Reapply filters to update the filteredHistoryItems list
        }
    
        this.updateGroupButtonState(); // Update the state of group/ungroup buttons
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
        this.filterHistoryItems();
    }

    handleDateFilterChange(event) {
        const filterType = event.target.dataset.filter;
        if (filterType === 'from') {
            this.dateFrom = event.target.value ? new Date(event.target.value) : null;
        } else if (filterType === 'to') {
            this.dateTo = event.target.value ? new Date(event.target.value) : null;
        }
        this.filterHistoryItems();
    }

    handleSort(event) {
        const column = event.currentTarget.dataset.column;
        this.sortOrder = (this.sortedBy === column && this.sortOrder === 'asc') ? 'desc' : 'asc';
        this.sortOrderIcon = this.sortOrder === 'asc' ? 'utility:arrowup' : 'utility:arrowdown';
        this.sortedBy = column;
        this.sortHistoryItems();
    }

    sortHistoryItems() {
        if (this.showRelatedItems) {
            // Sort only the parent items if grouping by related items
            this.historyItems.sort((a, b) => this.compareRecords(a, b));
            
            // Ensure children remain under their respective parents and are also sorted
            this.historyItems = this.historyItems.map(parent => {
                return {
                    ...parent,
                    children: parent.children.sort((a, b) => this.compareRecords(a, b)) // Sort children within each parent
                };
            });
        } else {
            // Flatten the list including children for sorting when not grouping by related items
            let itemsToSort = this.historyItems.flatMap(item => [item, ...item.children]);

            
            // Apply sorting to the flat list
            itemsToSort.sort((a, b) => this.compareRecords(a, b));
            
            // Directly assign the sorted flat list to filteredHistoryItems for rendering
            this.filteredHistoryItems = itemsToSort.map(item => ({
                ...item,
                isChild: false, // Treat all as independent records for rendering
                children: [] // Clear children since we're not grouping
            }));

    
            // Skip reassigning back to this.historyItems since we're treating them as independent records
            return;
        }
    
        this.filterHistoryItems(); // Apply filters again after sorting
    }
    
    // Helper method for comparing records based on sorting criteria
    compareRecords(a, b) {
        console.log('compare records called');
        let valA, valB;
    
        if (this.sortedBy === 'Selected') {
            valA = a.isSelected ? 0 : 1;
            valB = b.isSelected ? 0 : 1;
        } else if (this.sortedBy === 'Important') {
            valA = a.Flag_as_important__c ? 0 : 1;
            valB = b.Flag_as_important__c ? 0 : 1;
        } else if (this.sortedBy === 'Notes__c') {
            valA = a.hasDetails ? 1 : 0;
            valB = b.hasDetails ? 1 : 0;
        } else {
            valA = a[this.sortedBy] ? a[this.sortedBy].toLowerCase() : '';
            valB = b[this.sortedBy] ? b[this.sortedBy].toLowerCase() : '';
        }
    
        if (valA < valB) {
            return this.sortOrder === 'asc' ? -1 : 1;
        } else if (valA > valB) {
            return this.sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
    }

    filterHistoryItems() {
        this.filteredHistoryItems = this.historyItems.flatMap(item => {
            item.isExpanded = this.expandedItems.has(item.Id);
            item.iconName = this.getIconName(item.isExpanded);

            const searchKeyLower = this.searchKey?.toLowerCase() ?? '';
            const searchMatch = this.searchKey ? (
                (item.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.notes?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.documentType?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
            ) : true;
    
            const dateMatch = (
                (!this.dateFrom || new Date(item.Date_Inserted__c ?? 0) >= this.dateFrom) &&
                (!this.dateTo || new Date(item.Date_Inserted__c ?? 0) <= this.dateTo)
            );
    
            const historyTypeMatch = this.selectedHistoryType === 'allHistory' ||
                (this.selectedHistoryType === 'myHistory' && item.Case_Officer__c === this.currentUserId);
    
            const isMatch = searchMatch && dateMatch && historyTypeMatch;
    
            if (isMatch) {
                const result = [item];
                if (this.showRelatedItems && item.isExpanded && item.children && item.children.length > 0) {
                    const childRecords = item.children.flatMap(child => {
                        const childSearchMatch = this.searchKey ? (
                            (child.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                            (child.notes?.toLowerCase() ?? '').includes(searchKeyLower) ||
                            (child.documentType?.toLowerCase() ?? '').includes(searchKeyLower) ||
                            (child.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
                        ) : true;
    
                        const childDateMatch = (
                            (!this.dateFrom || new Date(child.Date_Inserted__c ?? 0) >= this.dateFrom) &&
                            (!this.dateTo || new Date(child.Date_Inserted__c ?? 0) <= this.dateTo)
                        );
    
                        const childHistoryTypeMatch = this.selectedHistoryType === 'allHistory' ||
                            (this.selectedHistoryType === 'myHistory' && child.Case_Officer__c === this.currentUserId);
    
                        if (childSearchMatch && childDateMatch && childHistoryTypeMatch) {
                            return [{ ...child, isChild: true }];
                        }
                        return [];
                    });
                    result.push(...childRecords);
                } else if (!this.showRelatedItems && item.children && item.children.length > 0) {
                    result.push(...item.children.map(child => ({ ...child, isChild: true })));
                }
                return result;
            }
    
            return [];
        });
    
        this.updateGroupButtonState();
    }

    handleHistoryTypeChange(event) {
        this.selectedHistoryType = event.detail.value;
        this.filterHistoryItems();
    }

    handleRowClick(event) {
        const itemId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === itemId);
        
        // Set the selected record details and precompute the alternative text
        if (record && record.Details__c) {
            this.selectedRecordDetails = record.Details__c;
        } else {
            this.selectedRecordDetails = '';
        }
    }

    handleRowSelection(event) {
        const itemId = event.currentTarget.dataset.id;
    
        this.historyItems = this.historyItems.map(item => {
            // Toggle the selection of the parent record if it matches the itemId
            if (item.Id === itemId) {
                item.isSelected = !item.isSelected;
            }
    
            // Iterate over child records and toggle their selection if they match the itemId
            if (item.children && item.children.length > 0) {
                item.children = item.children.map(child => {
                    if (child && child.Id === itemId) {
                        child.isSelected = !child.isSelected;
                    }
                    return child;
                });
            }
    
            return item;
        });
    
        this.updateGroupButtonState(); // Update the state of the group/ungroup buttons based on current selections
    }
    
       
    updateGroupButtonState() {
        const selectedRecords = this.historyItems.flatMap(item => {
            let records = [];
            if (item.isSelected) {
                records.push(item);
            }
            if (item.children && item.children.length > 0) {
                records = records.concat(item.children.filter(child => child.isSelected));
            }
            return records;
        });
    
        let hasChildSelected = false;
        let hasParentSelected = false;
        let selectedParentCount = 0;
        let selectedParentWithChildrenCount = 0;
        let selectedParentWithoutChildrenCount = 0;
        let selectedChildWithinSameParent = false;
    
        const parentIds = new Set();
    
        selectedRecords.forEach(item => {
            if (item.isChild) {
                hasChildSelected = true;
    
                // Track the parent ID of the selected child
                parentIds.add(item.parentId);
    
                // Check if this child is selected along with its parent
                const parentRecord = selectedRecords.find(parent => parent.Id === item.parentId);
                if (parentRecord) {
                    selectedChildWithinSameParent = true;
                }
            } else {
                hasParentSelected = true;
                selectedParentCount++;
    
                // Track the parent ID
                parentIds.add(item.Id);
    
                if (item.children && item.children.length > 0) {
                    selectedParentWithChildrenCount++;
                } else {
                    selectedParentWithoutChildrenCount++;
                }
            }
        });
    
        // Disable buttons if a parent record is selected and a child record from another parent record is selected
        if (hasParentSelected && hasChildSelected && parentIds.size > 1) {
            this.isGroupDisabled = true;
            this.isUngroupDisabled = true;
        }
        // New condition to disable the group button if a parent with children and a child record are selected
        else if (hasParentSelected && hasChildSelected && selectedChildWithinSameParent) {
            this.isGroupDisabled = true;
            this.isUngroupDisabled = false;
        }
        // If one parent with children and one parent without children are selected, enable the group button
        else if (selectedParentWithChildrenCount === 1 && selectedParentWithoutChildrenCount >= 1) {
            this.isGroupDisabled = false;
            this.isUngroupDisabled = true; // Ungroup button should be disabled in this scenario
        }
        // If a parent record with children is selected, enable the ungroup button
        else if (selectedParentWithChildrenCount === 1 && selectedParentWithoutChildrenCount === 0) {
            this.isUngroupDisabled = false;
            this.isGroupDisabled = true; // Disable the group button in this scenario
        }
        // If a parent record is selected and no other record is selected
        else if (selectedParentCount === 1 && selectedRecords.length === 1) {
            this.isGroupDisabled = true;
            this.isUngroupDisabled = true;
        }
        // If two or more parent records with children are selected, disable group and ungroup buttons for all parent records
        else if (selectedParentWithChildrenCount >= 2) {
            this.isGroupDisabled = true;
            this.isUngroupDisabled = true;
        }
        // If two parent records are selected, and one has children, the group button is enabled
        else if (selectedParentCount === 2 && selectedParentWithChildrenCount === 1 && selectedParentWithoutChildrenCount === 1) {
            this.isGroupDisabled = false;
            this.isUngroupDisabled = true;
        }
        // If a parent and child record are selected (from the same parent), enable the ungroup button
        else if (hasParentSelected && hasChildSelected && selectedChildWithinSameParent) {
            this.isGroupDisabled = true;
            this.isUngroupDisabled = false;
        }        
        // Default case: no records selected or all other cases
        else {
            this.isGroupDisabled = selectedRecords.length === 0 || hasChildSelected;
            this.isUngroupDisabled = selectedRecords.length === 0 || selectedParentCount > 1 || (hasParentSelected && hasChildSelected && !selectedChildWithinSameParent);
        }
    }
            
    
    handleGroup() {
        const selectedRecords = this.filteredHistoryItems.flatMap(item => {
            if (item.isSelected) {
                return [item];
            }
            if (item.isExpanded) {
                return item.children.filter(child => child.isSelected);
            }
            return [];
        });
    
        if (selectedRecords.length === 0) {
            this.showToast('Error', 'Please select records to group.', 'error');
            return;
        }
    
        const hasChild = selectedRecords.some(item => item.isChild);
        const hasParent = selectedRecords.some(item => !item.isChild);
        if (hasChild && hasParent) {
            this.showToast('Error', 'You cannot group both parent and child records together.', 'error');
            return;
        }
    
        const parentRecord = selectedRecords.reduce((oldest, item) => {
            return new Date(item.Date_Inserted__c) < new Date(oldest.Date_Inserted__c) ? item : oldest;
        });
    
        const childRecordIds = selectedRecords
            .filter(record => record.Id !== parentRecord.Id)
            .map(record => record.Id);
    
        if (childRecordIds.length > 0) {
            groupHistoryRecords({ parentRecordId: parentRecord.Id, childRecordIds })
                .then(() => {
                    // After grouping, reassign the children of the newly grouped record to the new parent
                    const reassignedChildRecordIds = [];
                    selectedRecords.forEach(record => {
                        if (record.Id !== parentRecord.Id && record.hasChildren) {
                            record.children.forEach(child => {
                                child.parentId = parentRecord.Id;
                                child.Parent_History_Record__c = parentRecord.Id; // Update the Parent_History_Record__c field
                                reassignedChildRecordIds.push(child.Id);
                            });
                        }
                    });
    
                    // If there are reassigned child records, call Apex to update their parent IDs
                    if (reassignedChildRecordIds.length > 0) {
                        this.updateChildRecordParents(reassignedChildRecordIds, parentRecord.Id);
                    } else {
                        this.refreshHistoryItems();
                    }
                })
                .catch(error => {
                    this.showToast('Error', 'Error grouping records: ' + error.body.message, 'error');
                });
        } else {
            this.showToast('Error', 'There are no valid child records to group.', 'error');
        }
    }
    
    updateChildRecordParents(childRecordIds, newParentId) {
        // Apex call to update the Parent_History_Record__c for the child records
        updateParentHistoryRecords({ childRecordIds, newParentId })
            .then(() => {
                this.showToast('Success', 'Child records reassigned successfully.', 'success');
                this.refreshHistoryItems();
            })
            .catch(error => {
                this.showToast('Error', 'Error updating child records: ' + error.body.message, 'error');
            });
    } 
    
    handleUngroup() {
        // Flatten the selected records from filteredHistoryItems
        const selectedRecords = this.filteredHistoryItems.flatMap(item => {
            let records = [];
        
            if (item.isSelected) {
                records.push(item);
            }
        
            if (item?.isExpanded && item.children?.length > 0) {
                const selectedChildren = item.children.filter(child => child?.isSelected);
                if (selectedChildren.length > 0) {
                    records = records.concat(selectedChildren);
                }
            }
        
            return records;
        });
    
        // Edge Case: No records selected
        if (selectedRecords.length === 0) {
            this.showToast('Error', 'Please select records to ungroup.', 'error');
            return;
        }
    
        const selectedParentRecords = selectedRecords.filter(item => !item.isChild);
        const selectedChildRecords = selectedRecords.filter(item => item.isChild);
    
        // Case 1: If a parent and some of its children are selected
        if (selectedParentRecords.length === 1 && selectedChildRecords.length > 0) {
            const parentRecord = selectedParentRecords[0];
            const childRecords = parentRecord.children || [];
    
            // Identify the selected and unselected child records within the same parent
            const selectedChildRecordIds = selectedChildRecords.map(child => child.Id);
            const unselectedChildRecords = childRecords.filter(child => !selectedChildRecordIds.includes(child.Id));
    
            // Step 1: Ungroup the selected child records first
            ungroupHistoryRecords({ recordIds: selectedChildRecordIds })
                .then(() => {
                    // Step 2: After ungrouping child records, handle the parent record
                    return ungroupHistoryRecords({ recordIds: [parentRecord.Id] });
                })
                .then(() => {
                    // Step 3: Handle unselected children by making the oldest unselected child the new parent
                    if (unselectedChildRecords.length > 0) {
                        this.reassignChildrenToOldest(unselectedChildRecords);
                    } else {
                        this.refreshHistoryItems(); // No children left, just refresh
                    }
                })
                .catch(error => {
                    this.showToast('Error', 'Error ungrouping selected records: ' + this.getErrorMessage(error), 'error');
                });
    
        } else if (selectedParentRecords.length === 1 && selectedParentRecords[0].children.length > 0 && selectedChildRecords.length === 0) {
            // Case 3: Only the parent is selected, and it has children, but none of the children are selected
            const parentRecord = selectedParentRecords[0];
            const childRecords = parentRecord.children || [];
    
            if (childRecords.length === 1) {
                // If there is only one child, it simply becomes a new parent
                const childRecordId = childRecords[0].Id;
    
                ungroupHistoryRecords({ recordIds: [childRecordId] })
                    .then(() => {
                        this.showToast('Success', 'Child record ungrouped and made a parent.', 'success');
                        this.refreshHistoryItems();
                    })
                    .catch(error => {
                        this.showToast('Error', 'Error ungrouping records: ' + this.getErrorMessage(error), 'error');
                    });
    
            } else if (childRecords.length > 1) {
                // If there are multiple children, make the oldest child the new parent
                const oldestChild = this.findOldestChild(childRecords);

                const remainingChildRecordIds = childRecords
                    .filter(child => child.Id !== oldestChild.Id)
                    .map(child => child.Id);
    
                ungroupHistoryRecords({ recordIds: [oldestChild.Id] })
                    .then(() => {
                        if (remainingChildRecordIds.length > 0) {
                            this.groupUnderNewParent(oldestChild, remainingChildRecordIds);
                        } else {
                            this.expandedItems.set(oldestChild.Id, true);
                            this.refreshHistoryItems();
                        }
                    })
                    .catch(error => {
                        this.showToast('Error', 'Error ungrouping records: ' + this.getErrorMessage(error), 'error');
                    });
            }
    
        } else if (selectedChildRecords.length > 0) {
            // Case 2: Only child records are selected
            const childRecordIds = selectedChildRecords.map(child => child.Id);
    
            ungroupHistoryRecords({ recordIds: childRecordIds })
                .then(() => {
                    this.historyItems = this.historyItems.map(item => {
                        item.children = item.children.map(child => {
                            if (childRecordIds.includes(child.Id)) {
                                return { ...child, isSelected: false }; // Reset the selection state
                            }
                            return child;
                        });
    
                        // If any child is ungrouped, also set the parent item's isSelected to false
                        const hasUngroupedChild = item.children.some(child => childRecordIds.includes(child.Id));
                        if (hasUngroupedChild) {
                            item.isSelected = false;
                        }
    
                        return { ...item, children: [...item.children] };
                    });

                    // Create a shallow copy of the historyItems array to ensure reactivity
                    this.historyItems = [...this.historyItems];

                    // Force the UI to update the checkbox states
                    this.showToast('Success', 'Selected child records ungrouped successfully.', 'success');
                    this.refreshHistoryItems();
                })
                .catch(error => {
                    this.showToast('Error', 'Error ungrouping child records: ' + this.getErrorMessage(error), 'error');
                });
        } else {
            this.showToast('Error', 'No valid records to ungroup.', 'error');
        }
    }

    resetCheckboxStates() {
        // Use querySelectorAll to get all checkboxes and reset their state based on the isSelected property
        const checkboxes = this.template.querySelectorAll('lightning-input[data-id]');
    
        checkboxes.forEach(checkbox => {
            const itemId = checkbox.dataset.id;
            const item = this.historyItems.flatMap(item => [item, ...item.children]).find(i => i.Id === itemId);
    
            if (item) {
                // If the item is a child and its parent is selected, uncheck the child
                if (item.isChild && item.parentId) {
                    const parentRecord = this.historyItems.find(parent => parent.Id === item.parentId);
                    if (parentRecord && parentRecord.isSelected) {
                        checkbox.checked = false;
                        item.isSelected = false;
                        return;
                    }
                }
                // Otherwise, set the checkbox state according to isSelected
                checkbox.checked = item.isSelected;
            }
        });
    }
    
    
    // Utility function to find the oldest child
    findOldestChild(childRecords) {
        return childRecords.reduce((oldest, child) => {
            return new Date(child.Date_Inserted__c) < new Date(oldest.Date_Inserted__c) ? child : oldest;
        }, childRecords[0]);
    }
    
    // Utility function to reassign children under the oldest one
    reassignChildrenToOldest(unselectedChildRecords) {
        if (unselectedChildRecords.length === 1) {
            const childRecordId = unselectedChildRecords[0].Id;
    
            ungroupHistoryRecords({ recordIds: [childRecordId] })
                .then(() => {
                    this.showToast('Success', 'Child record ungrouped and made a parent.', 'success');
                    this.refreshHistoryItems();
                })
                .catch(error => {
                    this.showToast('Error', 'Error ungrouping records: ' + this.getErrorMessage(error), 'error');
                });
        } else {
            const oldestChild = this.findOldestChild(unselectedChildRecords);
    
            const remainingChildRecordIds = unselectedChildRecords
                .filter(child => child.Id !== oldestChild.Id)
                .map(child => child.Id);
    
            ungroupHistoryRecords({ recordIds: [oldestChild.Id] })
                .then(() => {
                    if (remainingChildRecordIds.length > 0) {
                        this.groupUnderNewParent(oldestChild, remainingChildRecordIds);
                    } else {
                        this.refreshHistoryItems();
                    }
                })
                .catch(error => {
                    this.showToast('Error', 'Error ungrouping records: ' + this.getErrorMessage(error), 'error');
                });
        }
    }
    
    // Utility function to group under a new parent
    groupUnderNewParent(oldestChild, remainingChildRecordIds) {
        groupHistoryRecords({
            parentRecordId: oldestChild.Id,
            childRecordIds: remainingChildRecordIds
        })
            .then(() => {
                this.expandedItems.set(oldestChild.Id, true);
                this.showToast('Success', 'Oldest child reassigned as new parent.', 'success');
                this.refreshHistoryItems();
            })
            .catch(error => {
                console.error('Error reassigning new parent:', error);
                this.showToast('Error', 'Error reassigning new parent: ' + this.getErrorMessage(error), 'error');
            });
    }
    
    getErrorMessage(error) {
        // Check if the error has a body with a message
        if (error && error.body && error.body.message) {
            return error.body.message;
        }
        // Check if the error itself is a string or has a message
        if (error && error.message) {
            return error.message;
        }
        // Default fallback
        return 'An unexpected error occurred';
    }

    // deselectAllItems() {
    //     this.historyItems = this.historyItems.map(item => {
    //         item.isSelected = false;
    //         item.children = item.children.map(child => {
    //             child.isSelected = false;
    //             return child;
    //         });
    //         return item;
    //     });

    //     this.updateGroupButtonState();
    // }
    
    
    get sortedByText() {
        const fieldLabelMap = {
            'Date_Inserted__c': 'Date Inserted',
            'Action__c': 'Action',
            'Notes__c': 'Notes',
            'DocumentType__c': 'Document Type',
            'FileSize__c': 'File Size',
            'Draft__c': 'Draft',
            'Case_Officer_Name': 'Case Officer',
            'Important': 'Important'
        };

        const sortedByLabel = fieldLabelMap[this.sortedBy] || this.sortedBy;
        const sortOrderText = this.sortOrder === 'asc' ? '(ascending)' : '(descending)';
        return `Sorted by ${sortedByLabel} ${sortOrderText} - Filtered by ${this.selectedHistoryType === 'allHistory' ? 'all history' : 'my history'}`;
    }

    get isSortedByDate() {
        return this.sortedBy === 'Date_Inserted__c';
    }

    get isSortedByAction() {
        return this.sortedBy === 'Action__c';
    }

    get isSortedByNotes() {
        return this.sortedBy === 'Notes__c';
    }

    get isSortedByDocumentType() {
        return this.sortedBy === 'DocumentType__c';
    }

    get isSortedByFileSize() {
        return this.sortedBy === 'FileSize__c';
    }

    get isSortedByDraft() {
        return this.sortedBy === 'Draft__c';
    }

    get isSortedByCaseOfficer() {
        return this.sortedBy === 'Case_Officer_Name';
    }

    get isSortedByImportant() {
        return this.sortedBy === 'Important';
    }

    get isSortedBySelected() {
        return this.sortedBy === 'Selected';
    }
          
    handleForward(event) {
        const itemId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === itemId);

        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({
            HtmlBody: `Please find the details of the record below:<br><br>Date: ${record.Date_Inserted__c}<br>Action: ${record.Action__c}<br>Document Type: ${record.documentType}<br>File Size: ${record.fileSize}<br>Draft: ${record.draft}<br>Case Officer: ${record.Case_Officer_Name}<br><br>Notes:<br>${record.notes}`,
            Subject: `Forwarding Record: ${record.Action__c}`
        });
    }

    formatFileSize(size) {
        if (!size) {
            return '';
        }
        if (size < 1024) {
            return size + ' B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(2) + ' kB';
        } else if (size < 1024 * 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    }
}