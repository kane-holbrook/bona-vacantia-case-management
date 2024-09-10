import { LightningElement, api, wire, track } from 'lwc';
import getEstateAccData from '@salesforce/apex/EstateDataController.getEstateAccData';
import getBVCaseData from '@salesforce/apex/EstateDataController.getBVCaseData';
import createEstateAcc from '@salesforce/apex/EstateDataController.createEstateAcc';
import createAssets from '@salesforce/apex/EstateDataController.createAssets';
import createLiabilities from '@salesforce/apex/EstateDataController.createLiabilities';
import updateEstateAccData from '@salesforce/apex/EstateDataController.updateEstateAccData';
import updateAssets from '@salesforce/apex/EstateDataController.updateAssets';
import updateLiabilities from '@salesforce/apex/EstateDataController.updateLiabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';

export default class EstateGrid extends LightningElement {
    @track accrualsColumns = [
        { label: 'Date of Death Value', fieldName: 'Date_of_Death_Value__c', type: 'currency', editable: true, sortable: true },
        { label: 'Accruals Asset Value', fieldName: 'Accruals_Asset_Value__c', type: 'currency', editable: true, sortable: true },
        { label: 'Asset Holder Name & Ref Number', fieldName: 'Asset_Holder_Name_and_Ref_Number__c', type: 'text', editable: true, sortable: true },
        { label: 'Value of Assets Collected', fieldName: 'Value_of_Assets_Collected__c', type: 'currency', editable: true, sortable: true },
    ];

    @track liabilitiesColumns = [
        { label: 'Liability at Date of Death', fieldName: 'Liability_at_Date_of_Death__c', type: 'currency', editable: true, sortable: true },
        { label: 'Accruals Liability Value', fieldName: 'Accruals_Liability_Value__c', type: 'currency', editable: true, sortable: true },
        { label: 'Liability Owed To & Reason', fieldName: 'Liability_owed_to_and_reason__c', type: 'text', editable: true, sortable: true },
        { label: 'Liabilities Paid', fieldName: 'Liabilities_Paid__c', type: 'currency', editable: true, sortable: true },
    ];

    @api recordId;

    @track bvCaseData;
    @track originalEstateAccData;
    @track estateAccData;
    @track isChanged = false;
    @track draftValuesAssets = [];
    @track draftValuesLiabilities = [];
    isRecordIdAvailable = false;

    @track sortedBy;
    @track sortedDirection = 'asc';

    estateAccData = {
        Assets__r: [],
        Liabilities__r: []
    };

    bvCaseData = {};

    wiredBVCaseDataResult;
    wiredEstateAccDataResult;

    @wire(getBVCaseData, { recordId: '$recordId' })
    wiredBVCaseData(result) {
        this.wiredBVCaseDataResult = result;
        if (result.data) {
            this.bvCaseData = result.data;
        } else if (result.error) {
            console.error('Error:', result.error);
        }
    }

    @wire(getEstateAccData, { bvCaseId: '$recordId' })
    wiredEstateAccData(result) {
        this.wiredEstateAccDataResult = result;
        if (result.data) {
            this.estateAccData = { ...result.data[0] };
            this.addAssetPlaceholder();
            this.addLiabilityPlaceholder();
        } else if (result.error) {
            console.error('Error:', result.error);
        }
    
        // Check if recordId is available and create a blank EstateAcc__c record if needed
        if (this.recordId && !this.estateAccData.Id && !this.isRecordIdAvailable) { // Check if Id is not available
            this.createBlankEstateAcc();
        }
    }

    createBlankEstateAcc() {
        const estateAccToCreate = {
            BV_Case__c: this.recordId,
        };

        createEstateAcc({ estateAccToCreate })
            .then(result => {
                this.estateAccData = { ...result };
                this.addAssetPlaceholder();
                this.addLiabilityPlaceholder();
            })
            .catch(error => {
                console.error('Error creating EstateAcc__c record:', error);
            });

        // Set the isRecordIdAvailable flag to true to avoid creating the record again
        this.isRecordIdAvailable = true;
    }

    processPostSaveActions(addPlaceholderType) {
        // Refresh BV Case Data
        refreshApex(this.wiredBVCaseDataResult);
    
        // Refresh Estate Acc Data and conditionally re-add placeholders
        refreshApex(this.wiredEstateAccDataResult).then(() => {
            if (addPlaceholderType === 'asset' || addPlaceholderType === 'both') {
                this.addAssetPlaceholder();
            }
            if (addPlaceholderType === 'liability' || addPlaceholderType === 'both') {
                this.addLiabilityPlaceholder();
            }
        });
    }    

    addAssetPlaceholder() {
        if (this.estateAccData.Assets__r && !this.estateAccData.Assets__r.some(asset => !asset.Id)) {
            this.estateAccData.Assets__r = [...this.estateAccData.Assets__r, {}];
        } else if (!this.estateAccData.Assets__r) {
            this.estateAccData.Assets__r = [{}];
        }
    }
    
    addLiabilityPlaceholder() {
        if (this.estateAccData.Liabilities__r && !this.estateAccData.Liabilities__r.some(liability => !liability.Id)) {
            this.estateAccData.Liabilities__r = [...this.estateAccData.Liabilities__r, {}];
        } else if (!this.estateAccData.Liabilities__r) {
            this.estateAccData.Liabilities__r = [{}];
        }
    }

    handleSaveAssets(event) {
        const draftValues = event.detail.draftValues;
        const estateAccId = this.estateAccData.Id;
    
        // Regular expression to match Salesforce ID format
        const sfIdRegex = /^[a-zA-Z0-9]{15,18}$/;
    
        // Filter out records for update and create operations
        const updatedAssets = draftValues.filter(record => record.Id && sfIdRegex.test(record.Id));
        const newAssets = draftValues.filter(record => !record.Id || !sfIdRegex.test(record.Id))
        .map(record => {
            // Create a new object excluding the Id property
            const { Id, ...newRecord } = record;
            return { ...newRecord, Estate_and_Accrual__c: estateAccId };
        });
    
        // Handle new records creation
        if (newAssets.length > 0) {
            createAssets({ newAssets: newAssets })
                .then(result => {
                    this.showToast('Success', 'New assets added', 'success');
                    this.processPostSaveActions('asset');
                    // Clear draft values after saving
                    this.draftValuesAssets = [];
                })
                .catch(error => {
                    this.showToast('Error adding new assets', error.body, 'error');
                });
        }
    
        // Handle existing records updates
        if (updatedAssets.length > 0) {
            updateAssets({ assetsToUpdate: updatedAssets })
                .then(() => {
                    this.showToast('Success', 'Assets updated', 'success');
                    this.processPostSaveActions('asset');
                    // Clear draft values after saving
                    this.draftValuesAssets = [];
                })
                .catch(error => {
                    this.showToast('Error updating assets', error.body, 'error');
                });
        }
    }

    handleSaveLiabilities(event) {
        const draftValues = event.detail.draftValues;
        const estateAccId = this.estateAccData.Id;
    
        // Regular expression to match Salesforce ID format
        const sfIdRegex = /^[a-zA-Z0-9]{15,18}$/;
    
        // Filter out records for update and create operations
        const updatedLiabilities = draftValues.filter(record => record.Id && sfIdRegex.test(record.Id));
        const newLiabilities = draftValues.filter(record => !record.Id || !sfIdRegex.test(record.Id))
                                          .map(record => {
                                              // Create a new object excluding the Id property
                                              const { Id, ...newRecord } = record;
                                              return { ...newRecord, Estate_and_Accrual__c: estateAccId };
                                          });
    
        // Handle new records creation
        if (newLiabilities.length > 0) {
            createLiabilities({ newLiabilities: newLiabilities })
                .then(result => {
                    this.showToast('Success', 'New liabilities added', 'success');
                    this.processPostSaveActions('liability');
                    this.draftValuesLiabilities = [];
                })
                .catch(error => {
                    this.showToast('Error adding new liabilities', error.body, 'error');
                });
        }
    
        // Handle existing records updates
        if (updatedLiabilities.length > 0) {
            updateLiabilities({ liabilitiesToUpdate: updatedLiabilities })
                .then(() => {
                    this.showToast('Success', 'Liabilities updated', 'success');
                    this.processPostSaveActions('liability');
                    this.draftValuesLiabilities = [];
                })
                .catch(error => {
                    this.showToast('Error updating liabilities', error.body, 'error');
                });
        }
    }

    handleInputChange(event) {
        this.isChanged = true;
        const field = event.target.dataset.field;
        if (field) {
            this.estateAccData = { ...this.estateAccData, [field]: event.target.value };
        }
    }

    handleSaveFields() {
        updateEstateAccData({ updatedEstateAcc: this.estateAccData })
            .then(() => {
                this.showToast('Success', 'Record updated successfully', 'success');
                this.originalEstateAccData = JSON.parse(JSON.stringify(this.estateAccData)); // Update the original data
                this.isChanged = false; // Reset the change tracking
            })
            .catch(error => {
                this.showToast('Error updating record', error.body.message, 'error');
            });
    }

    handleCancelFields() {
        this.estateAccData = JSON.parse(JSON.stringify(this.originalEstateAccData)); // Deep clone to restore original data
        this.isChanged = false; // Reset the change tracking
    }  

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    handleSort(event) {
        this.sortedBy = event.detail.fieldName;
        this.sortedDirection = event.detail.sortDirection;
        this.sortData(event.target.name);
    }

    sortData(tableName) {
        let data = tableName === 'assets_datatable' ? [...this.estateAccData.Assets__r] : [...this.estateAccData.Liabilities__r];
        let fieldName = this.sortedBy;
        let sortDirection = this.sortedDirection;

        const key = (a) => {
            if (a[fieldName] == null) return '';
            return typeof a[fieldName] === 'string' ? a[fieldName].toLowerCase() : a[fieldName];
        };

        const reverse = sortDirection === 'asc' ? 1 : -1;

        data.sort((a, b) => {
            a = key(a);
            b = key(b);
            if (typeof a === 'number' && typeof b === 'number') {
                return reverse * (a - b);
            }
            return reverse * ((a > b) - (b > a));
        });

        if (tableName === 'assets_datatable') {
            this.estateAccData = { ...this.estateAccData, Assets__r: data };
        } else {
            this.estateAccData = { ...this.estateAccData, Liabilities__r: data };
        }
    }
}