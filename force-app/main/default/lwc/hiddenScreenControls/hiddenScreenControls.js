import { LightningElement, api, track } from 'lwc';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import HIDE_FROM_HUEL_FIELD from '@salesforce/schema/Case_Detail__c.Hide_From_Huel__c';
import BV_CASE_FIELD from '@salesforce/schema/Case_Detail__c.BV_Case__c';
import RECORD_TYPE_FIELD from '@salesforce/schema/Case_Detail__c.RecordTypeId';

export default class HiddenScreenControls extends LightningElement {
    @track isModalOpen = false;
    @track isHideFromHuelChecked = false;

    @api bvCaseId;
    @api recordTypeId; // Admin - Hidden Screen record type ID passed from parent component
    caseDetailId;

    connectedCallback() {
        this.fetchCaseDetail();
    }

    @api
    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    fetchCaseDetail() {
        getCaseDetail({ bvCaseId: this.bvCaseId, recordTypeId: this.recordTypeId })
            .then(result => {
                if (result) {
                    this.caseDetailId = result.Id;
                    // Convert "Yes"/"No" to boolean for checkbox
                    this.isHideFromHuelChecked = result.Hide_From_Huel__c === 'Yes';
                }
            })
            .catch(error => {
                console.error('Error fetching case detail:', error);
            });
    }

    handleCheckboxChange(event) {
        this.isHideFromHuelChecked = event.target.checked;
    }

    handleSave() {
        const hideFromHuelValue = this.isHideFromHuelChecked ? 'Yes' : 'No';

        if (this.caseDetailId) {
            // Update existing Case_Detail__c record
            const fields = {};
            fields.Id = this.caseDetailId;
            fields[HIDE_FROM_HUEL_FIELD.fieldApiName] = hideFromHuelValue;

            const recordInput = { fields };
            updateRecord(recordInput)
                .then(() => {
                    this.closeModal();
                    this.dispatchEvent(new CustomEvent('savehidden'));
                })
                .catch(error => {
                    console.error('Error saving case detail:', error);
                });
        } else {
            // Create new Case_Detail__c record with the correct RecordTypeId
            const fields = {};
            fields[HIDE_FROM_HUEL_FIELD.fieldApiName] = hideFromHuelValue;
            fields[BV_CASE_FIELD.fieldApiName] = this.bvCaseId;
            fields[RECORD_TYPE_FIELD.fieldApiName] = this.recordTypeId;

            const recordInput = { apiName: CASE_DETAIL_OBJECT.objectApiName, fields };
            createRecord(recordInput)
                .then((result) => {
                    this.caseDetailId = result.id;
                    this.closeModal();
                    this.dispatchEvent(new CustomEvent('savehidden'));
                })
                .catch(error => {
                    console.error('Error creating case detail:', error);
                });
        }
    }
}