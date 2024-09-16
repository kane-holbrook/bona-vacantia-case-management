import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import { setRecordId } from 'c/sharedService';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';

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

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredCase({ error, data }) {
        if (data) {
            this.caseData = data.fields;
        } else if (error) {
            console.error('Error retrieving record', error);
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
        this.retrieveRecordTypeDeveloperName();
        setRecordId(this.recordId);
    }

    async retrieveRecordTypeDeveloperName() {
        try {
            const recordTypeId = await getRecordTypeIdForRecord({ recordId: this.recordId });
            const recordTypeDeveloperName = await getRecordTypeDeveloperName({ recordTypeId: recordTypeId });
            this.recordTypeDeveloperName = recordTypeDeveloperName;
            this.setCaseTypeName(recordTypeDeveloperName);
        } catch (error) {
            this.error = error;
            this.treeData = undefined;
        }
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