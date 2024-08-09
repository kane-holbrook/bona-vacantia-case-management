import { LightningElement, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import CURRENT_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Current_Officer__c';
import DATE_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_Officer__c';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import { getRecordId } from 'c/sharedService';

export default class CaseOfficerButtons extends LightningElement {
    @track recordId;  // The BV_Case__c recordId
    @track caseDetailId; // Stores the Case_Detail__c Id for Officer History
    @track officerHistoryRecordTypeId; // Stores the Record Type Id for Officer_History
    @track caseDetailRecord; // Holds the Case_Detail__c record

    actions = [
        { actionId: '1', label: 'Put away', disabled: false },
        { actionId: '2', label: 'Re-allocate case', disabled: false },
        { actionId: '3', label: 'Change case category', disabled: false },
        { actionId: '4', label: 'Add accrual', disabled: false },
        { actionId: '5', label: 'Reverse accrual', disabled: false },
        { actionId: '6', label: 'LM case review', disabled: false },
        { actionId: '7', label: 'Section 27', disabled: false }
    ];

    connectedCallback() {
        this.recordId = getRecordId();
    }

    @wire(getObjectInfo, { objectApiName: CASE_DETAIL_OBJECT })
    objectInfo({ data, error }) {
        if (data) {
            const recordTypes = data.recordTypeInfos;
            this.officerHistoryRecordTypeId = Object.keys(recordTypes).find(rtId => recordTypes[rtId].name === 'Officer History');
            this.loadCaseDetailRecord();
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    loadCaseDetailRecord() {
        if (this.recordId && this.officerHistoryRecordTypeId) {
            getCaseDetail({ bvCaseId: this.recordId, recordTypeId: this.officerHistoryRecordTypeId })
                .then(result => {
                    if (result) {
                        this.caseDetailRecord = result;
                        this.caseDetailId = result.Id;
                    }
                })
                .catch(error => {
                    console.error('Error loading Case_Detail__c record:', error);
                });
        }
    }

    handleActionClick(event) {
        const actionName = event.target.label;
        console.log(`Button clicked: ${actionName}`);
        if (actionName === 'Re-allocate case') {
            this.template.querySelector('c-re-allocate-case').openModal();
        }
    }

    handleCaseOfficerSave(event) {
        const newCaseOfficer = event.detail;

        if (this.caseDetailId) {
            // Update existing Case_Detail__c record
            this.updateCaseDetail(newCaseOfficer);
        } else {
            // Create new Case_Detail__c record
            this.createCaseDetail(newCaseOfficer);
        }
    }

    createCaseDetail(newCaseOfficer) {
        const fields = {};
        fields[CURRENT_OFFICER_FIELD.fieldApiName] = newCaseOfficer;
        fields[DATE_OFFICER_FIELD.fieldApiName] = new Date().toISOString();
        fields['BV_Case__c'] = this.recordId;
        fields['RecordTypeId'] = this.officerHistoryRecordTypeId; // Use the dynamically retrieved Record Type Id

        const recordInput = { apiName: CASE_DETAIL_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                this.caseDetailId = result.id;
                console.log('Case_Detail__c created successfully with Id: ' + this.caseDetailId);
                // Optionally, handle further actions like notifying the user
            })
            .catch(error => {
                console.error('Error creating Case_Detail__c:', error);
                // Optionally, handle error like showing an error message to the user
            });
    }

    updateCaseDetail(newCaseOfficer) {
        const fields = {};
        fields['Id'] = this.caseDetailId;

        const currentOfficer = this.caseDetailRecord.Current_Officer__c;
        const currentDateOfficer = this.caseDetailRecord.Date_Officer__c;

        if (currentOfficer) {
            fields[PREVIOUS_9_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_8__c;
            fields[DATE_9_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_8_Officer__c;

            fields[PREVIOUS_8_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_7__c;
            fields[DATE_8_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_7_Officer__c;

            fields[PREVIOUS_7_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_6__c;
            fields[DATE_7_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_6_Officer__c;

            fields[PREVIOUS_6_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_5__c;
            fields[DATE_6_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_5_Officer__c;

            fields[PREVIOUS_5_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_4__c;
            fields[DATE_5_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_4_Officer__c;

            fields[PREVIOUS_4_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_3__c;
            fields[DATE_4_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_3_Officer__c;

            fields[PREVIOUS_3_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_2__c;
            fields[DATE_3_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_2_Officer__c;

            fields[PREVIOUS_2_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_1__c;
            fields[DATE_2_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_1_Officer__c;

            fields[PREVIOUS_OFFICER_FIELD.fieldApiName] = currentOfficer;
            fields[DATE_1_OFFICER_FIELD.fieldApiName] = currentDateOfficer;
        }

        // Set the new current officer and the current date
        fields[CURRENT_OFFICER_FIELD.fieldApiName] = newCaseOfficer;
        fields[DATE_OFFICER_FIELD.fieldApiName] = new Date().toISOString();

        const recordInput = { fields };
        updateRecord(recordInput)
            .then(() => {
                console.log('Case_Detail__c updated successfully');
                // Optionally, handle further actions like notifying the user
            })
            .catch(error => {
                console.error('Error updating Case_Detail__c:', error);
                // Optionally, handle error like showing an error message to the user
            });
    }
}