import { LightningElement, track, wire } from 'lwc';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import { getRecordId } from 'c/sharedService';

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

    connectedCallback() {
        this.bvCaseId = getRecordId();
        this.loadCaseDetailRecord();
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
        console.log('bvCaseId', this.bvCaseId);
        console.log('officerHistoryRecordTypeId', this.officerHistoryRecordTypeId);
        if (this.bvCaseId && this.officerHistoryRecordTypeId) {
            getCaseDetail({ bvCaseId: this.bvCaseId, recordTypeId: this.officerHistoryRecordTypeId })
                .then(result => {
                    console.log('result', result);
                    if (result) {
                        this.currentOfficer = result.Current_Officer__c;
                        this.currentOfficerDate = result.Date_Officer__c;
                        this.previous1 = result.Previous_1__c;
                        this.previous1Date = result.Date_1_Officer__c;
                        this.previous2 = result.Previous_2__c;
                        this.previous2Date = result.Date_2_Officer__c;
                        this.previous3 = result.Previous_3__c;
                        this.previous3Date = result.Date_3_Officer__c;
                        this.previous4 = result.Previous_4__c;
                        this.previous4Date = result.Date_4_Officer__c;
                        this.previous5 = result.Previous_5__c;
                        this.previous5Date = result.Date_5_Officer__c;
                        this.previous6 = result.Previous_6__c;
                        this.previous6Date = result.Date_6_Officer__c;
                        this.previous7 = result.Previous_7__c;
                        this.previous7Date = result.Date_7_Officer__c;
                        this.previous8 = result.Previous_8__c;
                        this.previous8Date = result.Date_8_Officer__c;
                        this.previous9 = result.Previous_9__c;
                        this.previous9Date = result.Date_9_Officer__c;
                        this.putAway = result.Put_Away__c;
                        this.reopened = result.Reopened__c;
                        this.reopenedBy = result.Reopened_By__c;
                    }
                })
                .catch(error => {
                    console.error('Error loading Case_Detail__c record:', error);
                });
        }
    }

    handleDateChange(event) {
        const field = event.target.label.toLowerCase().replace(/\s/g, '');
        this[field] = event.target.value;
    }
}