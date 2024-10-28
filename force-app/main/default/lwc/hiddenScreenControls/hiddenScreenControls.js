import { LightningElement, api, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import HIDE_FROM_HUEL_FIELD from '@salesforce/schema/Case_Detail__c.Hide_From_Huel__c';
import CLEARED_FOR_PUBLISHING_FIELD from '@salesforce/schema/Case_Detail__c.Cleared_For_Publishing__c';
import PUBLISHED_FIELD from '@salesforce/schema/Case_Detail__c.Published__c';
import BV_CASE_FIELD from '@salesforce/schema/Case_Detail__c.BV_Case__c';
import RECORD_TYPE_FIELD from '@salesforce/schema/Case_Detail__c.RecordTypeId';
import CASE_TYPE_CODE_FIELD from '@salesforce/schema/Case_Detail__c.Case_Type_Code__c';
import ENTERED_BY_FIELD from '@salesforce/schema/Case_Detail__c.Entered_By__c';
import DATE_ENTERED_FIELD from '@salesforce/schema/Case_Detail__c.Date_Entered__c';
import OPEN_CLOSED_FIELD from '@salesforce/schema/Case_Detail__c.Open_Closed__c';
import BV_FAIS_NO_FIELD from '@salesforce/schema/Case_Detail__c.Bv_Fais_No__c';

export default class HiddenScreenControls extends LightningElement {
    @track isModalOpen = false;
    @track isHideFromHuelChecked = false;
    @track isClearedForPublishingChecked = false;
    @track isPublishedChecked = false;
    @track caseTypeCode = '';
    @track enteredBy = '';
    @track dateEntered = '';
    @track openClosed = '';
    @track bvFaisNo = null;

    @api bvCaseId;
    @api recordTypeId;
    @api isEstates = false; // New property to determine if it's an Estates screen
    caseDetailId;
    wiredCaseDetailResult; // Variable to store the wired result

    @wire(getCaseDetail, { bvCaseId: '$bvCaseId', recordTypeId: '$recordTypeId' })
    wiredCaseDetail(result) {
        this.wiredCaseDetailResult = result; // Store the result for refresh
        const { error, data } = result;
        if (data) {
            this.caseDetailId = data.Id;
            console.log('result', data);
            if (this.isEstates) {
                this.isHideFromHuelChecked = data.Hide_From_Huel__c === 'Yes';
                this.caseTypeCode = data.Case_Type_Code__c;
                this.enteredBy = data.Entered_By__c;
                this.dateEntered = data.Date_Entered__c;
                this.openClosed = data.Open_Closed__c;
                this.bvFaisNo = data.Bv_Fais_No__c;
            } else {
                this.isClearedForPublishingChecked = data.Cleared_For_Publishing__c === 'Yes';
                this.isPublishedChecked = data.Published__c === 'Yes';
            }
        } else if (error) {
            console.error('Error fetching case detail:', error);
        }
    }

    @api
    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleCheckboxChange(event) {
        const fieldName = event.target.dataset.field;
        this[fieldName] = event.target.checked;
    }

    handleInputChange(event) {
        const fieldName = event.target.dataset.field;
        this[fieldName] = event.target.value;
    }

    handleSave() {
        const fields = {};
        fields.Id = this.caseDetailId;
        
        if (this.isEstates) {
            fields[HIDE_FROM_HUEL_FIELD.fieldApiName] = this.isHideFromHuelChecked ? 'Yes' : 'No';
            fields[CASE_TYPE_CODE_FIELD.fieldApiName] = this.caseTypeCode;
            fields[ENTERED_BY_FIELD.fieldApiName] = this.enteredBy;
            fields[DATE_ENTERED_FIELD.fieldApiName] = this.dateEntered;
            fields[OPEN_CLOSED_FIELD.fieldApiName] = this.openClosed;
            fields[BV_FAIS_NO_FIELD.fieldApiName] = this.bvFaisNo;
        } else {
            fields[CLEARED_FOR_PUBLISHING_FIELD.fieldApiName] = this.isClearedForPublishingChecked ? 'Yes' : 'No';
            fields[PUBLISHED_FIELD.fieldApiName] = this.isPublishedChecked ? 'Yes' : 'No';
        }

        if (this.caseDetailId) {
            // Update existing Case_Detail__c record
            const recordInput = { fields };
            console.log('recordInput', recordInput);
            updateRecord(recordInput)
                .then(() => {
                    this.closeModal();
                    this.dispatchEvent(new CustomEvent('savehidden'));
                    return refreshApex(this.wiredCaseDetailResult); // Refresh the data
                })
                .catch(error => {
                    console.error('Error saving case detail:', error);
                });
        } else {
            // Create new Case_Detail__c record
            fields[BV_CASE_FIELD.fieldApiName] = this.bvCaseId;
            fields[RECORD_TYPE_FIELD.fieldApiName] = this.recordTypeId;

            const recordInput = { apiName: CASE_DETAIL_OBJECT.objectApiName, fields };
            console.log('recordInput', recordInput);
            createRecord(recordInput)
                .then((result) => {
                    this.caseDetailId = result.id;
                    this.closeModal();
                    this.dispatchEvent(new CustomEvent('savehidden'));
                    return refreshApex(this.wiredCaseDetailResult); // Refresh the data
                })
                .catch(error => {
                    console.error('Error creating case detail:', error);
                });
        }
    }
}
