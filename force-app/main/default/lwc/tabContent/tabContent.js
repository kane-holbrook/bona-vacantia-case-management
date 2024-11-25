import { LightningElement, wire } from 'lwc';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import { getRecordId } from 'c/sharedService';

export default class TabContent extends LightningElement {
    recordId;
    isConv = false;

    connectedCallback() {
        this.recordId = getRecordId();
        this.retrieveRecordTypeDeveloperName();
    }

    async retrieveRecordTypeDeveloperName() {
        try {
            const recordTypeId = await getRecordTypeIdForRecord({ recordId: this.recordId });
            const recordTypeDeveloperName = await getRecordTypeDeveloperName({ recordTypeId });
            this.isConv = recordTypeDeveloperName === 'CONV';
        } catch (error) {
            console.error('Error retrieving record type developer name:', error);
        }
    }

    handleFlowFinished() {
        const caseOfficerHistory = this.template.querySelector('c-case-officer-history');
        if (caseOfficerHistory) {
            caseOfficerHistory.refreshCaseDetail();
        }
    }
}