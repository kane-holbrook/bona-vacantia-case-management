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
            this.currentOfficerDate = caseDetail.Date_Officer__c || '';
            this.previous1 = caseDetail.Previous_1__c || '';
            this.previous1Date = caseDetail.Date_1_Officer__c || '';
            this.previous2 = caseDetail.Previous_2__c || '';
            this.previous2Date = caseDetail.Date_2_Officer__c || '';
            this.previous3 = caseDetail.Previous_3__c || '';
            this.previous3Date = caseDetail.Date_3_Officer__c || '';
            this.previous4 = caseDetail.Previous_4__c || '';
            this.previous4Date = caseDetail.Date_4_Officer__c || '';
            this.previous5 = caseDetail.Previous_5__c || '';
            this.previous5Date = caseDetail.Date_5_Officer__c || '';
            this.previous6 = caseDetail.Previous_6__c || '';
            this.previous6Date = caseDetail.Date_6_Officer__c || '';
            this.previous7 = caseDetail.Previous_7__c || '';
            this.previous7Date = caseDetail.Date_7_Officer__c || '';
            this.previous8 = caseDetail.Previous_8__c || '';
            this.previous8Date = caseDetail.Date_8_Officer__c || '';
            this.previous9 = caseDetail.Previous_9__c|| '';
            this.previous9Date = caseDetail.Date_9_Officer__c || '';
            this.putAway = caseDetail.Put_Away__c || '';
            this.reopened = caseDetail.Reopened__c || '';
            this.reopenedBy = caseDetail.Reopened_By__c || '';
        } else if (result.error) {
            console.error('Error loading Case_Detail__c record:', result.error);
        }
    }

    @api
    refreshCaseDetail() {
        // Manually refresh the apex data
        refreshApex(this.wiredCaseDetailResult);
    }
}