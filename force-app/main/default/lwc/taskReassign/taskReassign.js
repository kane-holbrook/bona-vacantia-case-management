import { LightningElement, wire, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import getUsers from '@salesforce/apex/TaskController.getUsers';
import USER_OBJECT from '@salesforce/schema/User';

export default class TaskReassign extends LightningElement {
    @track selectedCaseOfficer;
    @track selectedDate;
    @track caseOfficerOptions = [];
    @track isOpen = false;

    @wire(getObjectInfo, { objectApiName: USER_OBJECT })
    userMetadata;

    // Fetch users using an Apex method instead of getPicklistValues
    @wire(getUsers)
    wiredUsers({ error, data }) {
        if (data) {
            console.log('User data:', data);
            this.caseOfficerOptions = data.map(user => {
                return { label: user.Name, value: user.Id };
            });
        } else if (error) {
            console.error('Error fetching users:', error);
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