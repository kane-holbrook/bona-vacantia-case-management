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
        return this.caseData.Forenames__c && this.caseData.Surname__c ? `${this.caseData.Forenames__c.value} ${this.caseData.Surname__c.value}` : 'No name specified';
    }

    get dateOfDeath() {
        return this.caseData.Date_Of_Death__c ? new Date(this.caseData.Date_Of_Death__c.value).toLocaleDateString('en-GB') : 'No date of death specified';
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
        emailQuickActionComponent.invoke({
        });
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