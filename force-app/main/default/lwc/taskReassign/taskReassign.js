import { LightningElement, wire, track } from 'lwc';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import USER_OBJECT from '@salesforce/schema/User';

export default class TaskReassign extends LightningElement {
    @track selectedCaseOfficer;
    @track selectedDate;
    @track caseOfficerOptions = [];
    @track isOpen = false;

    @wire(getObjectInfo, { objectApiName: USER_OBJECT })
    userMetadata;

    @wire(getPicklistValues, { recordTypeId: '$userMetadata.data.defaultRecordTypeId', fieldApiName: 'Name' })
    wiredUsers({ error, data }) {
        if (data) {
            this.caseOfficerOptions = data.values.map(user => {
                return { label: user.label, value: user.value };
            });
        } else if (error) {
            console.error(error);
        }
    }

    handleOfficerChange(event) {
        this.selectedCaseOfficer = event.detail.value;
    }

    handleDateChange(event) {
        this.selectedDate = event.detail.value;
    }

    handleSave() {
        // Logic to save the changes
        console.log('Selected Officer:', this.selectedCaseOfficer);
        console.log('Selected Date:', this.selectedDate);
        this.closeModal();
    }

    handleCancel() {
        // Logic to cancel the changes
        this.selectedCaseOfficer = null;
        this.selectedDate = null;
        this.closeModal();
    }

    openModal() {
        this.isOpen = true;
    }

    closeModal() {
        this.isOpen = false;
    }
}