import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, createRecord, updateRecord, getFieldValue } from 'lightning/uiRecordApi';
import getPicklistValues from '@salesforce/apex/LayoutController.getPicklistValues';
import getAccountSearchResults from '@salesforce/apex/LayoutController.getAccountSearchResults';
import getAccountById from '@salesforce/apex/LayoutController.getAccountById';
import CASE_NAME_FIELD from '@salesforce/schema/BV_Case__c.Name';

const FIELDS = ['BV_Case__c.RecordTypeId', 'BV_Case__c.Name']; // Add Name field here
const ACCOUNT_FIELDS = [
    'Account.Id',
    'Account.Name',
    'Account.Phone',
    'Account.ShippingStreet',
    'Account.ShippingCity',
    'Account.ShippingPostalCode',
    'Account.ShippingCountry'
];

export default class DatabaseStandardRecordModal extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api subRecordId;
    @api columns = [];
    @api columnLayoutStyle;
    @api recordTypeId;
    @api emptySpaceRowIndex;
    @api originalLeftColumnFields;
    @api originalRightColumnFields;
    @api heading;
    @track combinedData = [];
    @track leftColumnFields = [];
    @track rightColumnFields = [];
    @track leftColumnFieldsWithRowIndex = [];
    @track rightColumnFieldsWithRowIndex = [];
    @track isLoading = true; // Track the loading state
    @track showErrorMessage = false;

    @track accountId;  // Holds selected Account ID
    @track phone;
    @track addressLine1;
    @track addressLine2;
    @track addressLine3;
    @track addressLine4;
    @track city;
    @track postcode;
    @track searchResults = []; // Track search results for account lookup
    @track searchTerm = '';  // Current search term for the account
    @track selectedAccount = null; // Add this line to track the selected account
    @track currentFieldName = ''; // Add this line to track the current field name

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredRecord({ error, data }) {
        if (data) {
            this.record = data;
            this.caseName = getFieldValue(data, CASE_NAME_FIELD);
            this.processRecordData();
        } else if (error) {
            console.error('Error loading record', error);
        }
    }

    @wire(getRecord, { recordId: '$accountId', fields: ACCOUNT_FIELDS })
    wiredAccount({ error, data }) {
        if (data) {
            this.account = data;
            this.populateAccountFields();
        } else if (error) {
            console.error('Error loading account', error);
        }
    }

    get actualRecordTypeId() {
        return this.record ? this.record.fields.RecordTypeId.value : this.recordTypeId;
    }

    @api
    get recordData() {
        return this._recordData;
    }
    set recordData(value) {
        this._recordData = value;
        this.handleRecordDataChange();
    }

    handleRecordDataChange() {
        if (this._recordData) {
            this.processRecordData();
        }
    }

    async connectedCallback() {
        try {
            await this.processRecordData(); // Await the processing of record data
        } catch (error) {
            console.error('Error in connectedCallback:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async processRecordData() {
        try {
            if (!Array.isArray(this.recordData)) {
                this.recordData = [this.recordData];
            }

            let filteredData = this.recordData;
            if (this.subRecordId) {
                filteredData = this.recordData.filter(record => record.Id === this.subRecordId);
            }

            if (!this.subRecordId && this.objectApiName !== 'BV_Case__c') {
                filteredData = [{ Id: 'new', ...this.getEmptyRecordFields() }];
            }

            const isValidCaseName = this.isCaseNameValid(this.caseName);
            console.log('Case Name:', this.caseName);
            console.log('Is Valid Case Name:', isValidCaseName);

            this.combinedData = filteredData.map(record => ({
                id: record.Id === 'new' ? 'new' : (this.objectApiName === 'BV_Case__c' ? this.recordId : record.Id),
                fields: this.columns
                    .filter(column => column.type !== 'action')
                    .map(column => {
                        let length = null;
                        let type = column.type;
                        let formatter = null;
                        let step = null;
                        let max = null;
                        if (column.length) {
                            if (typeof column.length === 'object' && column.length.precision !== undefined && column.length.scale !== undefined) {
                                length = column.length.precision;
                                max = '9'.repeat(length - column.length.scale ) + (column.length.scale > 0 ? '.' + '9'.repeat(column.length.scale) : '');
                                if (column.type === 'currency') {
                                    type = 'number';
                                    formatter = 'currency';
                                    step = `.${'0'.repeat(column.length.scale - 1)}1`; // e.g., .01 for scale 2
                                }
                            } else {
                                length = column.length;
                            }
                        }
                        const decodedLabel = this.decodeHtmlEntities(column.label); // Decode HTML entities in the label
                        const fieldValue = record[column.fieldName];
                        if (this.isSalesforceId(fieldValue)) {
                            this.updateAccountDisplay(fieldValue);
                        }
                        // Add these properties to the field object
                        const isLookupField = column.fieldName.endsWith('_Lookup__c');
                        const correspondingTextField = isLookupField ? column.fieldName.replace('_Lookup__c', '__c') : null;
                        const isCorrespondingTextField = !isLookupField && this.columns.some(c => c.fieldName === `${column.fieldName.replace('__c', '')}_Lookup__c`);

                        const showField = isValidCaseName ? 
                            (isLookupField || (!isLookupField && !isCorrespondingTextField)) : 
                            (!isLookupField);

                        console.log(`Field: ${column.fieldName}, isLookup: ${isLookupField}, showField: ${showField}`);

                        return {
                            label: decodedLabel,
                            fieldName: column.fieldName,
                            type: type,
                            formatter: formatter,
                            step: step,
                            value: fieldValue || '',
                            length: length,
                            max: max,
                            isPicklist: column.type === 'picklist',
                            isCheckbox: column.type === 'checkbox',
                            isLongText: column.type === 'long-text',
                            isDate: column.type === 'date',
                            isLookup: column.type === 'lookup',
                            isDefault: column.type !== 'picklist' && column.type !== 'checkbox' && column.type !== 'long-text' && column.type !== 'date' && column.type !== 'lookup',
                            checked: column.type === 'checkbox' ? !!fieldValue : false,
                            options: column.type === 'picklist' ? [] : [],
                            listboxId: `listbox-${column.fieldName}`,
                            isLookupField,
                            correspondingTextField,
                            isCorrespondingTextField,
                            showField
                        };
                    })
            }));

            await this.loadPicklistOptions(); // Await loading picklist options
            this.splitFieldsByColumns();
            this.checkForAccountIds();
        } catch (error) {
            console.error('Error in processRecordData:', error);
        }
    }

    // Method to check if the value matches Salesforce ID format
    isSalesforceId(value) {
        // Check if the value is a string and has a length of 15 or 18 characters
        if (typeof value !== 'string' || (value.length !== 15 && value.length !== 18)) {
            return false;
        }

        // Check if the first 15 characters are alphanumeric
        const base15 = value.slice(0, 15);
        if (!/^[a-zA-Z0-9]+$/.test(base15)) {
            return false;
        }

        // If it's an 18-character ID, check if the last 3 characters are alphanumeric
        if (value.length === 18) {
            const suffix = value.slice(15);
            if (!/^[a-zA-Z0-9]{3}$/.test(suffix)) {
                return false;
            }
        }

        // Additional check: Salesforce IDs typically start with specific prefixes
        const validPrefixes = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0A', '0B', '0C', '0D', '0E', '0F', '0G', '0H', '0I', '0J', '0K', '0L', '0M', '0N', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5'];
        const prefix = value.slice(0, 2).toUpperCase();

        return validPrefixes.includes(prefix);
    }

    async loadPicklistOptions() {
        const promises = this.combinedData.flatMap(record =>
            record.fields
                .filter(item => item.isPicklist)
                .map(async item => {
                    const options = await getPicklistValues({ objectName: this.objectApiName, fieldName: item.fieldName });
                    item.options = options.map(value => ({ label: value, value }));
                })
        );
        await Promise.all(promises);
        this.combinedData = [...this.combinedData];
    }

    getEmptyRecordFields() {
        const emptyFields = {};
        this.columns.forEach(column => {
            if (column.fieldName) {
                emptyFields[column.fieldName] = column.type === 'checkbox' ? false : '';
            }
        });
        return emptyFields;
    }

    splitFieldsByColumns() {
        const leftFields = [];
        const rightFields = [];
        const leftFieldsWithRowIndex = [];
        const rightFieldsWithRowIndex = [];

        const maxRowIndex = Math.max(this.originalLeftColumnFields.length, this.originalRightColumnFields.length);

        for (let i = 0; i < maxRowIndex; i++) {
            const leftItem = this.originalLeftColumnFields[i];
            const rightItem = this.originalRightColumnFields[i];

            if (leftItem && leftItem.componentType === 'Field') {
                const field = this.findFieldInCombinedData(leftItem.apiName);
                if (field) {
                    leftFields.push(field);
                    leftFieldsWithRowIndex.push({ ...field, rowIndex: leftItem.rowIndex });
                }
            } else {
                leftFields.push({ componentType: 'EmptySpace', rowIndex: i });
                leftFieldsWithRowIndex.push({ componentType: 'EmptySpace', rowIndex: i, isEmptySpace: true });
            }

            if (rightItem && rightItem.componentType === 'Field') {
                const field = this.findFieldInCombinedData(rightItem.apiName);
                if (field) {
                    rightFields.push(field);
                    rightFieldsWithRowIndex.push({ ...field, rowIndex: rightItem.rowIndex });
                }
            } else {
                rightFields.push({ componentType: 'EmptySpace', rowIndex: i });
                rightFieldsWithRowIndex.push({ componentType: 'EmptySpace', rowIndex: i, isEmptySpace: true });
            }
        }

        const filteredLeftFieldsWithRowIndex = [];
        const filteredRightFieldsWithRowIndex = [];

        for (let i = 0; i < leftFieldsWithRowIndex.length; i++) {
            const leftItem = leftFieldsWithRowIndex[i];
            const rightItem = rightFieldsWithRowIndex[i];

            if (!(leftItem.isEmptySpace && rightItem.isEmptySpace)) {
                filteredLeftFieldsWithRowIndex.push(leftItem);
                filteredRightFieldsWithRowIndex.push(rightItem);
            }
        }

        // Extract the fields again after filtering
        this.leftColumnFields = filteredLeftFieldsWithRowIndex.map(item => item.componentType === 'EmptySpace' ? item : this.findFieldInCombinedData(item.apiName));
        this.rightColumnFields = filteredRightFieldsWithRowIndex.map(item => item.componentType === 'EmptySpace' ? item : this.findFieldInCombinedData(item.apiName));
        this.leftColumnFieldsWithRowIndex = filteredLeftFieldsWithRowIndex;
        this.rightColumnFieldsWithRowIndex = filteredRightFieldsWithRowIndex;

        console.log('leftFieldsWithRowIndex', this.leftColumnFieldsWithRowIndex);
        console.log('rightFieldsWithRowIndex', this.rightColumnFieldsWithRowIndex);
    
        console.log('left columns', this.leftColumnFields);
        console.log('right columns', this.rightColumnFields);
    }

    findFieldInCombinedData(apiName) {
        for (const record of this.combinedData) {
            for (const field of record.fields) {
                if (field.fieldName === apiName) {
                    return { ...field, recordId: record.id };
                }
            }
        }
        return null;
    }

    checkForAccountIds() {
        this.combinedData.forEach(record => {
            record.fields.forEach(field => {
                if (field.isLookup && this.isSalesforceId(field.value)) {
                    this.updateAccountDisplay(field.value);
                    this.accountId = field.value;
                    this.populateAccountFields();
                }
            });
        });
    }

    updateAccountDisplay(accountId) {
        getAccountById({ accountId })
            .then(account => {
                if (account) {
                    this.combinedData = this.combinedData.map(record => ({
                        ...record,
                        fields: record.fields.map(field => {
                            if (field.isLookup && field.value === accountId) {
                                return {
                                    ...field,
                                    value: account.Name,
                                    accountId: accountId,
                                };
                            }
                            this.searchTerm = account.Name;
                            return field;
                        })
                    }));
                    this.updateColumnFields();
                }
            })
            .catch(error => {
                console.error('Failed to fetch account name:', error);
            });
    }

    // Handle search input changes
    handleSearchInput(event) {
        this.searchTerm = event.target.value;
        this.currentFieldName = event.target.dataset.fieldName;
        // Debounce the search to avoid too many API calls
        window.clearTimeout(this.delayTimeout);
        this.delayTimeout = setTimeout(() => {
            this.performSearch();
        }, 300); // 300ms delay
    }

    performSearch() {
        if (this.searchTerm.length >= 2) {
            getAccountSearchResults({ searchTerm: this.searchTerm, heading: this.heading })
                .then(results => {
                    this.searchResults = results;
                    console.log('Results:', results);
                })
                .catch(error => {
                    console.error('Error fetching accounts', error);
                    this.searchResults = [];
                });
        } else {
            this.searchResults = [];
        }
    }

    // Handle account selection from the search results
    handleAccountSelect(event) {
        const selectedId = event.currentTarget.dataset.id;
        const selectedName = event.currentTarget.dataset.name;
        const fieldName = event.currentTarget.dataset.fieldName;
        this.selectedAccount = { Id: selectedId, Name: selectedName };
        this.accountId = selectedId;
        this.searchTerm = selectedName;
        this.searchResults = [];

        // Update the combinedData with the selected account
        this.updateCombinedDataWithSelectedAccount(fieldName);

        console.log('Selected Account:', this.selectedAccount);
    }

    handleClearAccount(event) {
        const fieldName = event.currentTarget.dataset.fieldName;
        this.selectedAccount = null;
        this.accountId = null;
        this.searchTerm = '';
        this.updateCombinedDataWithSelectedAccount(fieldName);
    }

    updateCombinedDataWithSelectedAccount(fieldName) {
        this.combinedData = this.combinedData.map(record => ({
            ...record,
            fields: record.fields.map(item => {
                if (item.fieldName === fieldName) {
                    return {
                        ...item,
                        value: this.selectedAccount ? this.selectedAccount.Name : '',
                        accountId: this.selectedAccount ? this.selectedAccount.Id : null
                    };
                }
                return item;
            })
        }));
        this.updateColumnFields();
    }

    // Populate the fields based on the selected account
    populateAccountFields() {
        if (this.account) {
            console.log('Account:', this.account);
            const accountFields = this.account.fields;
            const shippingStreet = accountFields.ShippingStreet.value || '';
            const shippingCity = accountFields.ShippingCity.value || '';
            const shippingPostalCode = accountFields.ShippingPostalCode.value || '';
            const shippingCountry = accountFields.ShippingCountry.value || '';

            // Split the shipping street into parts
            const streetParts = shippingStreet.split(',').map(part => part.trim());

            // Populate address lines
            this.addressLine1 = streetParts[0] || '';
            this.addressLine2 = streetParts[1] || '';
            this.addressLine3 = streetParts[2] || '';
            this.addressLine4 = streetParts[3] || '';

            // If city is not part of the street address, add it to addressLine3
            if (shippingCity && !streetParts.includes(shippingCity)) {
                if (this.addressLine3) {
                    this.addressLine4 = this.addressLine3;
                }
                this.addressLine3 = shippingCity;
            }

            // Add country as the last line if present
            if (shippingCountry) {
                if (this.addressLine4) {
                    this.addressLine4 += ', ' + shippingCountry;
                } else {
                    this.addressLine4 = shippingCountry;
                }
            }

            this.city = shippingCity;
            this.postcode = shippingPostalCode;
            this.phone = accountFields.Phone.value || '';

            this.updateCombinedData();
            this.updateColumnFields();
        }
    }

    updateCombinedData() {
        this.combinedData = this.combinedData.map(record => ({
            ...record,
            fields: record.fields.map(item => {
                let updatedValue = item.value;
                if (item.label && item.label.startsWith('Phone')) {
                    updatedValue = this.phone;
                } else if (item.label && item.label.startsWith('Address Line 1')) {
                    updatedValue = this.addressLine1;
                } else if (item.label && item.label.startsWith('Address Line 2')) {
                    updatedValue = this.addressLine2;
                } else if (item.label && item.label.startsWith('Address Line 3')) {
                    updatedValue = this.addressLine3;
                } else if (item.label && item.label.startsWith('Address Line 4')) {
                    updatedValue = this.addressLine4;
                } else if (item.label && item.label.startsWith('City')) {
                    updatedValue = this.city;
                } else if (item.fieldName && item.fieldName.startsWith('Postcode')) {
                    updatedValue = this.postcode;
                }
                return { ...item, value: updatedValue };
            })
        }));
        console.log('updateCombinedData', this.combinedData);
    }

    updateColumnFields() {
        this.leftColumnFieldsWithRowIndex = this.leftColumnFieldsWithRowIndex.map(field => 
            field ? this.findUpdatedField(field) : null
        ).filter(Boolean);
        this.rightColumnFieldsWithRowIndex = this.rightColumnFieldsWithRowIndex.map(field => 
            field ? this.findUpdatedField(field) : null
        ).filter(Boolean);
    }

    findUpdatedField(field) {
        console.log('findUpdatedField', field);
        if (!field || field.componentType === 'EmptySpace') {
            return field;
        }
        const updatedField = this.combinedData[0]?.fields.find(item => item.fieldName === field.fieldName);
        return updatedField || field;
    }

    handleInputChange(event) {
        const recordId = event.target.dataset.recordId;
        const fieldName = event.target.name;
        const updatedValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

        this.combinedData = this.combinedData.map(record => {
            if (record.id === recordId) {
                record.fields = record.fields.map(item => {
                    if (item.fieldName === fieldName) {
                        return { ...item, value: updatedValue, checked: event.target.type === 'checkbox' ? updatedValue : item.checked };
                    }
                    return item;
                });
            }
            return record;
        });
    }

    handleSave() {
        const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
        let allInputsValid = true;
        inputs.forEach(input => {
            if (!input.reportValidity()) {
                allInputsValid = false;
            }
        });

        if (!allInputsValid) {
            this.showErrorMessage = true;
            return;
        }

        this.showErrorMessage = false;

        this.combinedData.forEach(record => {
            const fields = {};
            record.fields.forEach(item => {
                if (item.isLookupField && item.showField) {
                    // For visible lookup fields, save both the lookup and the corresponding text field
                    fields[item.fieldName] = item.accountId || null;
                    fields[item.correspondingTextField] = item.value || '';
                } else if (!item.isLookupField) {
                    // For all non-lookup fields, save regardless of whether a lookup field is selected
                    if (item.isCheckbox) {
                        fields[item.fieldName] = !!item.checked;
                    } else {
                        fields[item.fieldName] = item.value;
                    }
                }
            });

            if (record.id === 'new') {
                fields.BV_Case__c = this.recordId;
                fields.RecordTypeId = this.recordTypeId;

                const newRecordInput = {
                    apiName: this.objectApiName,
                    fields: fields
                };

                createRecord(newRecordInput)
                    .then(record => {
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error creating record:', error);
                    });
            } else {
                fields.Id = record.id;
                fields.RecordTypeId = this.objectApiName === 'BV_Case__c' ? this.actualRecordTypeId : this.recordTypeId;

                const recordInput = {
                    fields: fields
                };

                updateRecord(recordInput)
                    .then(() => {
                        const recordUpdatedEvent = new CustomEvent('recordupdated', { detail: { recordId: record.id } });
                        this.dispatchEvent(recordUpdatedEvent);
                    })
                    .catch(error => {
                        console.error('Error updating record:', record.id, error);
                    });
            }
        });
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancelupdate'));
    }

    get isTwoColumnLayout() {
        return this.columnLayoutStyle === 2;
    }

    get leftFieldsWithDividers() {
        if (!this.leftColumnFieldsWithRowIndex || this.leftColumnFieldsWithRowIndex.length === 0) {
            return [];
        }
        return this.addDividers(this.leftColumnFieldsWithRowIndex);
    }

    get rightFieldsWithDividers() {
        if (!this.rightColumnFieldsWithRowIndex || this.rightColumnFieldsWithRowIndex.length === 0) {
            return [];
        }
        return this.addDividers(this.rightColumnFieldsWithRowIndex);
    }

    getDividerIndices() {
        const combinedDividerIndices = [];
        const maxLength = Math.max(this.originalLeftColumnFields.length, this.originalRightColumnFields.length);

        for (let i = 0; i < maxLength; i++) {
            const leftItem = this.originalLeftColumnFields[i];
            const rightItem = this.originalRightColumnFields[i];

            if (leftItem && rightItem && leftItem.componentType === 'EmptySpace' && rightItem.componentType === 'EmptySpace' && leftItem.rowIndex === rightItem.rowIndex) {
                combinedDividerIndices.push(leftItem.rowIndex);
            }
        }

        return combinedDividerIndices;
    }

    getFieldPattern(length) {
        if (length && typeof length === 'object' && 'precision' in length && 'scale' in length) {
            const precision = length.precision;
            const scale = length.scale;
            return `^\\d{0,${precision - scale}}(\\.\\d{0,${scale}})?$`;
        }
        return '';
    }

    isNumberType(field) {
        return field.type === 'number' || field.type === 'currency';
    }

    addDividers(fields) {
        const fieldsWithDividers = [];
        const combinedDividerIndices = this.getDividerIndices();

        fields.forEach((field, index) => {
            const fieldWithAttributes = {
                ...field,
                key: field.fieldName,
                isEmptySpace: field.componentType === 'EmptySpace',
                isNumber: this.isNumberType(field),
                pattern: this.getFieldPattern(field.length)
            };

            fieldsWithDividers.push(fieldWithAttributes);

            if (index < fields.length - 1) {
                const nextField = fields[index + 1];
                const dividerIndicesInRange = combinedDividerIndices.filter(
                    dividerIndex => field.rowIndex < dividerIndex && dividerIndex <= nextField.rowIndex
                );

                dividerIndicesInRange.forEach(dividerIndex => {
                    fieldsWithDividers.push({ isDivider: true, key: `divider-${dividerIndex}` });
                });
            } else {
                const lastDividerIndices = combinedDividerIndices.filter(
                    dividerIndex => dividerIndex > field.rowIndex
                );

                lastDividerIndices.forEach(dividerIndex => {
                    fieldsWithDividers.push({ isDivider: true, key: `divider-${dividerIndex}` });
                });
            }
        });

        return fieldsWithDividers;
    }

    decodeHtmlEntities(text) {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    }

    isCaseNameValid(caseName) {
        if (!caseName) return false;
        const validPrefixes = ['COMP', 'ESTA', 'FOIR', 'CONV', 'GENE'];
        const regex = new RegExp(`^(${validPrefixes.join('|')})\\d{2}#\\d+$`);
        return regex.test(caseName);
    }
}