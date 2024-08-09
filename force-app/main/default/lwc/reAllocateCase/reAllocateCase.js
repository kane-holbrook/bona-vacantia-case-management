import { LightningElement, api, track } from 'lwc';

export default class ReAllocateCase extends LightningElement {
    @track isModalOpen = false;
    @track newCaseOfficer = '';

    @api
    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleInputChange(event) {
        this.newCaseOfficer = event.target.value;
    }

    handleSave() {
        const selectedEvent = new CustomEvent('save', {
            detail: this.newCaseOfficer
        });

        console.log('caseofficerevent', selectedEvent);
        this.dispatchEvent(selectedEvent);
        this.closeModal();
    }
}