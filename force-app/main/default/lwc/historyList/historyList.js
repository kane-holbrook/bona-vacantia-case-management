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
                    mergedRecord.children = history.Case_History__r.map(childRecord => {
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
                    });
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
                    console.log('Error fetching usernames', error);
                    this.showToast('Error', 'Error fetching user names', 'error');
                });
        } else {
            this.sortHistoryItems();
        }
    }

    refreshHistoryItems() {
        refreshApex(this.wiredHistoryItemsResult);
    }

    updateLastUpdated(isDeletion = false) {
        console.log('is deletion: ', isDeletion);
        const now = new Date();
    
        if (this.historyItems.length > 0) {
            const latestItem = this.historyItems.reduce((latest, item) => {
                const itemDate = new Date(item.Last_updated__c);
                return itemDate > new Date(latest.Last_updated__c) ? item : latest;
            }, this.historyItems[0]);
    
            let lastUpdateTime;
            if (isDeletion) {
                console.log('deletion occurred');
                lastUpdateTime = now; // If a deletion occurred, consider now as the last update time
                console.log('last update time: ', lastUpdateTime);
            } else {
                lastUpdateTime = new Date(latestItem.Last_updated__c);
            }
    
            const diffInMinutes = Math.floor((now - lastUpdateTime) / 60000);
            console.log('diff in minutes: ', diffInMinutes);
    
            if (diffInMinutes < 60) {
                this.lastUpdated = `${diffInMinutes} minutes ago`;
            } else if (diffInMinutes < 1440) {
                const diffInHours = Math.floor(diffInMinutes / 60);
                this.lastUpdated = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
            } else {
                const diffInDays = Math.floor(diffInMinutes / 1440);
                this.lastUpdated = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
            }
        } else {
            console.log('all items are deleted');
            // If all items are deleted, calculate the time difference from the last action (which is now)
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
            }
            return item;
        });
        this.filterHistoryItems();
    }


    handleAdd() {
        this.currentRecordId = null;
        this.currentRecord = {};
        this.isModalOpen = true;
    }

    handleViewEdit(event) {
        this.currentRecordId = event.currentTarget.dataset.id;
        let record = this.historyItems.find(item => item.Id === this.currentRecordId);

        if (!record) {
            // If no parent record is found, look for the record in child items
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
        this.currentRecordId = event.currentTarget.dataset.id;
        const record = this.historyItems.find(item => item.Id === this.currentRecordId);
        this.currentRecord = { ...record };
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
        this.refreshHistoryItems();
        // this.updateLastUpdated(true);
    }
    

    handleSave() {
        this.template.querySelector('c-history-edit-modal').saveRecord(this.recordId);
    }

    handleSaveSuccess() {
        this.isModalOpen = false;
        this.showToast('Success', 'Record saved successfully', 'success');
        this.refreshHistoryItems();
    }

    toggleShowRelatedItems(event) {
        this.showRelatedItems = event.target.checked;
        if (!this.showRelatedItems) {
            this.historyItems = this.historyItems.map(item => ({ 
                ...item, 
                isExpanded: false,
                iconName: this.getIconName(false)
            }));
        }
        this.filterHistoryItems();
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
        this.historyItems.sort((a, b) => {
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
        });
        this.filterHistoryItems();
    }
    

    filterHistoryItems() {
        this.filteredHistoryItems = this.historyItems.flatMap(item => {
            const searchKeyLower = this.searchKey.toLowerCase();
            const searchMatch = this.searchKey ? (
                (item.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.notes?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.documentType?.toLowerCase() ?? '').includes(searchKeyLower) ||
                (item.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
            ) : true;
    
            const dateMatch = (
                (!this.dateFrom || new Date(item.Date_Inserted__c) >= this.dateFrom) &&
                (!this.dateTo || new Date(item.Date_Inserted__c) <= this.dateTo)
            );
    
            const historyTypeMatch = this.selectedHistoryType === 'allHistory' || 
                (this.selectedHistoryType === 'myHistory' && item.Case_Officer__c === this.currentUserId);
    
            const isMatch = searchMatch && dateMatch && historyTypeMatch;
    
            if (isMatch) {
                const result = [item];
                if (item.isExpanded && item.children && item.children.length > 0) {
                    const childRecords = item.children.flatMap(child => {
                        // Apply the same filtering logic to child records
                        const childSearchMatch = this.searchKey ? (
                            (child.Action__c?.toLowerCase() ?? '').includes(searchKeyLower) ||
                            (child.notes?.toLowerCase() ?? '').includes(searchKeyLower) ||
                            (child.documentType?.toLowerCase() ?? '').includes(searchKeyLower) ||
                            (child.Case_Officer_Name?.toLowerCase() ?? '').includes(searchKeyLower)
                        ) : true;
    
                        const childDateMatch = (
                            (!this.dateFrom || new Date(child.Date_Inserted__c) >= this.dateFrom) &&
                            (!this.dateTo || new Date(child.Date_Inserted__c) <= this.dateTo)
                        );
    
                        const childHistoryTypeMatch = this.selectedHistoryType === 'allHistory' || 
                            (this.selectedHistoryType === 'myHistory' && child.Case_Officer__c === this.currentUserId);
    
                        if (childSearchMatch && childDateMatch && childHistoryTypeMatch) {
                            return [{ ...child, isChild: true }];
                        }
                        return [];
                    });
                    result.push(...childRecords);
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
            this.selectedRecordDetails = 'There are no history notes for this record.';
        }
    }

    handleRowSelection(event) {
        const itemId = event.currentTarget.dataset.id;
        console.log('itemId: ', itemId);
    
        this.historyItems = this.historyItems.map(item => {
            // Toggle the selection of the parent record if it matches the itemId
            if (item.Id === itemId) {
                item.isSelected = !item.isSelected;
                console.log('Parent item.isSelected: ', item.isSelected);
            }
    
            // Iterate over child records and toggle their selection if they match the itemId
            if (item.children && item.children.length > 0) {
                item.children = item.children.map(child => {
                    if (child && child.Id === itemId) {
                        child.isSelected = !child.isSelected;
                        console.log('Child item.isSelected: ', child.isSelected);
                    }
                    return child;
                });
            }
            
    
            return item;
        });
    
        this.updateGroupButtonState(); // Update the state of the group/ungroup buttons based on current selections
    }
    
       
    updateGroupButtonState() {
        // Combine parent and child records into selectedRecords
        const selectedRecords = this.historyItems.flatMap(item => {
            let records = [];
            if (item.isSelected) {
                console.log('Parent item: ', item);
                records.push(item);
            }
            if (item.children && item.children.length > 0) {
                console.log('Child items: ', item.children);
                records = records.concat(item.children.filter(child => child.isSelected));
            }
            return records;
        });
    
        let hasChildSelected = false;
        let hasParentSelected = false;
    
        selectedRecords.forEach(item => {
            if (item.isChild) {
                hasChildSelected = true;
            } else {
                hasParentSelected = true;
            }
        });
    
        // Determine if all selected records have the same parent ID (for children)
        const selectedParentIds = [...new Set(selectedRecords.filter(item => item.isChild).map(item => item.parentId))];
    
        // Disable the "Group" button if any child record is selected or if no records are selected
        this.isGroupDisabled = hasChildSelected || selectedRecords.length === 0;
    
        // Enable the "Ungroup" button only if all selected records are children of the same parent and no parent records are selected
        this.isUngroupDisabled = selectedRecords.length === 0 || selectedParentIds.length > 1 || hasParentSelected;

        this.isUngroupDisabled = !this.isUngroupDisabled;
        this.isUngroupDisabled = !this.isUngroupDisabled;
    
        console.log('hasChildSelected: ', hasChildSelected);
        console.log('hasParentSelected: ', hasParentSelected);
        console.log('isGroupDisabled: ', this.isGroupDisabled);
        console.log('isUngroupDisabled: ', this.isUngroupDisabled);
    }
    
    handleGroup() {
        // Flatten the selected records from filteredHistoryItems, considering both parents and children
        const selectedRecords = this.filteredHistoryItems.flatMap(item => {
            if (item.isSelected) {
                return [item];
            }
            // If a parent is selected, include its selected children
            if (item.isExpanded) {
                return item.children.filter(child => child.isSelected);
            }
            return [];
        });
    
        // Edge Case: No records selected
        if (selectedRecords.length === 0) {
            this.showToast('Error', 'Please select records to group.', 'error');
            return;
        }
    
        // Edge Case: Mixed selection of parent and child records
        const hasChild = selectedRecords.some(item => item.isChild);
        const hasParent = selectedRecords.some(item => !item.isChild);
        if (hasChild && hasParent) {
            this.showToast('Error', 'You cannot group both parent and child records together.', 'error');
            return;
        }
    
        // Proceed with grouping if valid selection
        const parentRecord = selectedRecords.reduce((oldest, item) => {
            return new Date(item.Date_Inserted__c) < new Date(oldest.Date_Inserted__c) ? item : oldest;
        });
    
        const childRecordIds = selectedRecords
            .filter(record => record.Id !== parentRecord.Id)
            .map(record => record.Id);
    
        if (childRecordIds.length > 0) {
            groupHistoryRecords({ parentRecordId: parentRecord.Id, childRecordIds })
                .then(() => {
                    this.showToast('Success', 'Records grouped successfully.', 'success');
                    this.refreshHistoryItems();
                })
                .catch(error => {
                    this.showToast('Error', 'Error grouping records: ' + error.body.message, 'error');
                });
        } else {
            this.showToast('Error', 'There are no valid child records to group.', 'error');
        }
    }
    
    
    handleUngroup() {
        // Flatten the selected child records from filteredHistoryItems
        const selectedRecords = this.filteredHistoryItems.flatMap(item => {
            // Only return selected children
            if (item.isExpanded) {
                return item.children.filter(child => child.isSelected);
            }
            return [];
        });
    
        // Edge Case: No records selected
        if (selectedRecords.length === 0) {
            this.showToast('Error', 'Please select records to ungroup.', 'error');
            return;
        }
    
        // Edge Case: Mixed selection of parent and child records
        const hasParent = selectedRecords.some(item => !item.isChild);
        if (hasParent) {
            this.showToast('Error', 'You can only ungroup child records.', 'error');
            return;
        }
    
        const recordIds = selectedRecords.map(record => record.Id);
    
        if (recordIds.length > 0) {
            ungroupHistoryRecords({ recordIds })
                .then(() => {
                    // Optional: Reassign the oldest child as the new parent if necessary
                    selectedRecords.forEach(child => {
                        const parent = this.historyItems.find(item => item.Id === child.parentId);
                        if (parent && parent.children) {
                            // Remove the ungrouped child from the parent's children list
                            parent.children = parent.children.filter(id => id !== child.Id);
    
                            // If the parent now has no children, check for a new oldest child
                            if (parent.children.length > 0) {
                                const oldestChildId = parent.children.reduce((oldestId, childId) => {
                                    const childRecord = this.historyItems.find(item => item.Id === childId);
                                    const oldestRecord = this.historyItems.find(item => item.Id === oldestId);
                                    return new Date(childRecord.Date_Inserted__c) < new Date(oldestRecord.Date_Inserted__c) ? childId : oldestId;
                                });
    
                                // Reassign oldestChildId as the new parent
                                groupHistoryRecords({ parentRecordId: oldestChildId, childRecordIds: parent.children.filter(id => id !== oldestChildId) })
                                    .then(() => {
                                        this.showToast('Success', 'Oldest child reassigned as new parent.', 'success');
                                    })
                                    .catch(error => {
                                        this.showToast('Error', 'Error reassigning new parent: ' + error.body.message, 'error');
                                    });
                            }
                        }
                    });
    
                    this.showToast('Success', 'Records ungrouped successfully', 'success');
                    this.refreshHistoryItems();
                })
                .catch(error => {
                    this.showToast('Error', 'Error ungrouping records: ' + error.body.message, 'error');
                });
        }
    }
    

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