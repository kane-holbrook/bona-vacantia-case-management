import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { getRecord } from 'lightning/uiRecordApi';
import { setRecordId } from 'c/sharedService';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';
import getCaseDetailForBVCase from '@salesforce/apex/CaseDetailController.getCaseDetailForBVCase';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

const FIELDS = [
    'BV_Case__c.Name',
    'BV_Case__c.Forenames__c',
    'BV_Case__c.Surname__c',
    'BV_Case__c.Date_Of_Death__c',
    'BV_Case__c.Dissolved_Company_No__c',
    'BV_Case__c.Date_of_Death_or_Dissolution__c',
    'BV_Case__c.Applicant__c',
    'BV_Case__c.Reply_Due__c'
];

export default class CaseDetails extends NavigationMixin(LightningElement) {
    @api recordId;
    @track recordTypeDeveloperName;
    @track caseTypeName;
    @track caseData = {};
    @track caseDetailData = {};
    @track caseStatus = 'Loading...';
    @track error;

    recordTypeId;

    subscription = {};
    channelName = '/event/CaseStatusChange__e';

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredCase(result) {
        this.wiredCaseResult = result;
        const { error, data } = result;
        if (data) {
            this.caseData = data.fields;
        } else if (error) {
            console.error('Error retrieving record', error);
        }
    }

    @wire(getCaseDetailForBVCase, { bvCaseId: '$recordId' })
    wiredCaseDetail(result) {
        this.wiredCaseDetailResult = result;
        const { error, data } = result;
        if (data) {
            this.caseDetailData = data;
            this.caseStatus = data.Open_Closed__c ? data.Open_Closed__c : 'No status available';
        } else if (error) {
            console.error('Error retrieving Case_Detail__c', error);
            this.caseStatus = 'Error retrieving case status';
        }
    }

    @wire(getRecordTypeIdForRecord, { recordId: '$recordId' })
    wiredRecordTypeId({ error, data }) {
        if (data) {
            this.recordTypeId = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.recordTypeId = undefined;
        }
    }

    @wire(getRecordTypeDeveloperName, { recordTypeId: '$recordTypeId' })
    wiredRecordTypeDeveloperName({ error, data }) {
        if (data) {
            this.recordTypeDeveloperName = data;
            this.setCaseTypeName(data);
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.recordTypeDeveloperName = undefined;
        }
    }

    get caseNumber() {
        return this.caseData.Name ? this.caseData.Name.value : 'No case number specified';
    }

    get deceasedName() {
        const forenames = this.caseData.Forenames__c ? this.caseData.Forenames__c.value : '';
        const surname = this.caseData.Surname__c ? this.caseData.Surname__c.value : '';
        
        if (forenames || surname) {
            return `${forenames} ${surname}`.trim();
        } else {
            return 'No name specified';
        }
    }

    get dateOfDeath() {
        return this.caseData.Date_Of_Death__c ? new Date(this.caseData.Date_Of_Death__c.value).toLocaleDateString('en-GB') : 'No date of death specified';
    }

    get dissolvedCompanyNo() {
        return this.caseData.Dissolved_Company_No__c ? this.caseData.Dissolved_Company_No__c.value : 'No company number specified';
    }

    get dateOfDeathOrDissolution() {
        return this.caseData.Date_of_Death_or_Dissolution__c ? new Date(this.caseData.Date_of_Death_or_Dissolution__c.value).toLocaleDateString('en-GB') : 'No date specified';
    }

    get applicant() {
        return this.caseData.Applicant__c ? this.caseData.Applicant__c.value : 'No applicant specified';
    }

    get replyDue() {
        return this.caseData.Reply_Due__c ? new Date(this.caseData.Reply_Due__c.value).toLocaleDateString('en-GB') : 'No reply due date specified';
    }

    get displayFields() {
        switch(this.recordTypeDeveloperName) {
            case 'ESTA':
                return {
                    field1: this.caseNumber,
                    field2: this.deceasedName,
                    field3: this.dateOfDeath,
                    label2: 'Deceased Name:',
                    label3: 'Date of Death:'
                };
            case 'COMP':
                return {
                    field1: this.caseNumber,
                    field2: this.dissolvedCompanyNo,
                    field3: this.dateOfDeathOrDissolution,
                    label2: 'Dissolved Company No:',
                    label3: 'Date of Dissolution:'
                };
            case 'CONV':
                return {
                    field1: this.caseNumber,
                    field2: this.dateOfDeathOrDissolution,
                    label2: 'Date of Death/Dissolution:'
                };
            case 'FOIR':
                return {
                    field1: this.caseNumber,
                    field2: this.applicant,
                    field3: this.replyDue,
                    label2: 'Applicant:',
                    label3: 'Reply Due:'
                };
            case 'GENE':
                return {
                    field1: this.caseNumber,
                    field2: this.dateOfDeathOrDissolution,
                    label2: 'Date of Death/Dissolution:'
                };
            default:
                return {
                    field1: this.caseNumber
                };
        }
    }

    connectedCallback() {
        setRecordId(this.recordId);
        this.registerErrorListener();
        this.handleSubscribe();
    }

    disconnectedCallback() {
        this.handleUnsubscribe();
    }

    handleSubscribe() {
        const messageCallback = (response) => {
            console.log('New message received: ', JSON.stringify(response));
            this.handleCaseStatusEvent(response.data.payload);
        };

        subscribe(this.channelName, -1, messageCallback).then(response => {
            console.log('Subscription request sent to: ', JSON.stringify(response.channel));
            this.subscription = response;
        });
    }

    handleUnsubscribe() {
        unsubscribe(this.subscription, response => {
            console.log('unsubscribe() response: ', JSON.stringify(response));
        });
    }

    registerErrorListener() {
        onError(error => {
            console.log('Received error from server: ', JSON.stringify(error));
        });
    }

    handleCaseStatusEvent(eventData) {
        console.log('Refreshing apex case details');
        refreshApex(this.wiredCaseResult);
        refreshApex(this.wiredCaseDetailResult);
        refreshApex(this.wiredRecordTypeIdResult);
    }

    handleEdit() {
        console.log('Edit action triggered');
        console.log('Record ID: ' + this.recordId);
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                actionName: 'edit'
            },
        });

        console.log('Record ID: ' + this.recordId);
    }

    handleChangeOwner() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'BV_Case__c',
                actionName: 'changeOwner'
            }
        });
    }

    handleChangeRecordType() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'BV_Case__c',
                actionName: 'changeRecordType'
            }
        });
    }

    handleDelete() {
        deleteRecord(this.recordId)
            .then(() => {
                this[NavigationMixin.Navigate]({
                    type: 'standard__objectPage',
                    attributes: {
                        objectApiName: 'BV_Case__c',
                        actionName: 'home'
                    }
                });
            })
            .catch(error => {
                console.error('Error deleting record', error);
            });
    }

    handleClone() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'BV_Case__c',
                actionName: 'clone'
            }
        });
    }

    handleSendAnEmail() {
        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({});
    }

    setCaseTypeName(recordTypeDeveloperName) {
        if (recordTypeDeveloperName == 'ESTA') {
            this.caseTypeName = 'Estates';
        } else if (recordTypeDeveloperName == 'COMP') {
            this.caseTypeName = 'Companies';
        } else if (recordTypeDeveloperName == 'CONV') {
            this.caseTypeName = 'Conveyancing';
        } else if (recordTypeDeveloperName == 'FOIR') {
            this.caseTypeName = 'Freedom of Information';
        } else if (recordTypeDeveloperName == 'GENE') {
            this.caseTypeName = 'General Files';
        } else {
            this.caseTypeName = '';
        }
    }
}