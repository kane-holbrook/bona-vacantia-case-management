import { LightningElement, api, track } from 'lwc';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import HIDE_FROM_HUEL_FIELD from '@salesforce/schema/Case_Detail__c.Hide_From_Huel__c';
import CLEARED_FOR_PUBLISHING_FIELD from '@salesforce/schema/Case_Detail__c.Cleared_For_Publishing__c';
import PUBLISHED_FIELD from '@salesforce/schema/Case_Detail__c.Published__c';
import BV_CASE_FIELD from '@salesforce/schema/Case_Detail__c.BV_Case__c';
import RECORD_TYPE_FIELD from '@salesforce/schema/Case_Detail__c.RecordTypeId';

export default class HiddenScreenControls extends LightningElement {
    @track isModalOpen = false;
    @track isHideFromHuelChecked = false;
    @track isClearedForPublishingChecked = false;
    @track isPublishedChecked = false;

    @api bvCaseId;
    @api recordTypeId;
    @api isEstates = false; // New property to determine if it's an Estates screen
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
                    if (this.isEstates) {
                        this.isHideFromHuelChecked = result.Hide_From_Huel__c === 'Yes';
                    } else {
                        this.isClearedForPublishingChecked = result.Cleared_For_Publishing__c === 'Yes';
                        this.isPublishedChecked = result.Published__c === 'Yes';
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching case detail:', error);
            });
    }

    handleCheckboxChange(event) {
        const fieldName = event.target.dataset.field;
        this[fieldName] = event.target.checked;
    }

    handleSave() {
        const fields = {};
        fields.Id = this.caseDetailId;
        
        if (this.isEstates) {
            fields[HIDE_FROM_HUEL_FIELD.fieldApiName] = this.isHideFromHuelChecked ? 'Yes' : 'No';
        } else {
            fields[CLEARED_FOR_PUBLISHING_FIELD.fieldApiName] = this.isClearedForPublishingChecked ? 'Yes' : 'No';
            fields[PUBLISHED_FIELD.fieldApiName] = this.isPublishedChecked ? 'Yes' : 'No';
        }

        if (this.caseDetailId) {
            // Update existing Case_Detail__c record
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
            // Create new Case_Detail__c record
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