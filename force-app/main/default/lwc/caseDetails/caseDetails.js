import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';

const FIELDS = [
    'BV_Case__c.Name',
    'BV_Case__c.Forenames__c',
    'BV_Case__c.Surname__c',
    'BV_Case__c.Died__c',
];

export default class CaseDetails extends NavigationMixin(LightningElement) {
    @api recordId;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    case;

    get caseNumber() {
        return this.case.data ? this.case.data.fields.Name.value : 'No case number specified';
    }

    get deceasedName() {
        return this.case.data ? `${this.case.data.fields.Forenames__c.value} ${this.case.data.fields.Surname__c.value}` : 'No name specified';
    }

    get dateOfDeath() {
        // Return in UK date format
        return this.case.data ? new Date(this.case.data.fields.Died__c.value).toLocaleDateString('en-GB') : 'No date of death specified';
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
}