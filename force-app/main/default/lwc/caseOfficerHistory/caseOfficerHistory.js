import { LightningElement, api, track, wire } from 'lwc';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import { getRecordId } from 'c/sharedService';
import { refreshApex } from '@salesforce/apex';

export default class CaseOfficerHistory extends LightningElement {
    @track currentOfficer;
    @track currentOfficerDate;
    @track previous1;
    @track previous1Date;
    @track previous2;
    @track previous2Date;
    @track previous3;
    @track previous3Date;
    @track previous4;
    @track previous4Date;
    @track previous5;
    @track previous5Date;
    @track previous6;
    @track previous6Date;
    @track previous7;
    @track previous7Date;
    @track previous8;
    @track previous8Date;
    @track previous9;
    @track previous9Date;
    @track putAway;
    @track reopened;
    @track reopenedBy;
    bvCaseId;
    officerHistoryRecordTypeId;

    wiredCaseDetailResult; // To store the wired result for refreshApex

    connectedCallback() {
        this.bvCaseId = getRecordId();
    }

    @wire(getObjectInfo, { objectApiName: CASE_DETAIL_OBJECT })
    objectInfo({ data, error }) {
        if (data) {
            const recordTypes = data.recordTypeInfos;
            this.officerHistoryRecordTypeId = Object.keys(recordTypes).find(rtId => recordTypes[rtId].name === 'Officer History');
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    @wire(getCaseDetail, { bvCaseId: '$bvCaseId', recordTypeId: '$officerHistoryRecordTypeId' })
    wiredCaseDetail(result) {
        this.wiredCaseDetailResult = result; // Store the result for refreshing later

        if (result.data) {
            const caseDetail = result.data;
            this.currentOfficer = caseDetail.Current_Officer__c || '';
            this.currentOfficerDate = this.formatDate(caseDetail.Date_Officer__c);
            this.previous1 = caseDetail.Previous_1__c || '';
            this.previous1Date = this.formatDate(caseDetail.Date_1_Officer__c);
            this.previous2 = caseDetail.Previous_2__c || '';
            this.previous2Date = this.formatDate(caseDetail.Date_2_Officer__c);
            this.previous3 = caseDetail.Previous_3__c || '';
            this.previous3Date = this.formatDate(caseDetail.Date_3_Officer__c);
            this.previous4 = caseDetail.Previous_4__c || '';
            this.previous4Date = this.formatDate(caseDetail.Date_4_Officer__c);
            this.previous5 = caseDetail.Previous_5__c || '';
            this.previous5Date = this.formatDate(caseDetail.Date_5_Officer__c);
            this.previous6 = caseDetail.Previous_6__c || '';
            this.previous6Date = this.formatDate(caseDetail.Date_6_Officer__c);
            this.previous7 = caseDetail.Previous_7__c || '';
            this.previous7Date = this.formatDate(caseDetail.Date_7_Officer__c);
            this.previous8 = caseDetail.Previous_8__c || '';
            this.previous8Date = this.formatDate(caseDetail.Date_8_Officer__c);
            this.previous9 = caseDetail.Previous_9__c|| '';
            this.previous9Date = this.formatDate(caseDetail.Date_9_Officer__c);
            this.putAway = caseDetail.Put_Away__c || '';
            this.reopened = this.formatDate(caseDetail.Reopened__c) || '';
            this.reopenedBy = caseDetail.Reopened_By__c || '';
        } else if (result.error) {
            console.error('Error loading Case_Detail__c record:', result.error);
        }
        else {
            // Set all fields to blank if result.data is undefined
            this.setAllFieldsToBlank();
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    setAllFieldsToBlank() {
        this.currentOfficer = '';
        this.currentOfficerDate = '';
        this.previous1 = '';
        this.previous1Date = '';
        this.previous2 = '';
        this.previous2Date = '';
        this.previous3 = '';
        this.previous3Date = '';
        this.previous4 = '';
        this.previous4Date = '';
        this.previous5 = '';
        this.previous5Date = '';
        this.previous6 = '';
        this.previous6Date = '';
        this.previous7 = '';
        this.previous7Date = '';
        this.previous8 = '';
        this.previous8Date = '';
        this.previous9 = '';
        this.previous9Date = '';
        this.putAway = '';
        this.reopened = '';
        this.reopenedBy = '';
    }

    @api
    refreshCaseDetail() {
        // Manually refresh the apex data
        refreshApex(this.wiredCaseDetailResult);
    }
}