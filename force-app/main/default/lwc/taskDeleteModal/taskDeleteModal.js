import { LightningElement, api } from 'lwc';

export default class TaskDeleteModal extends LightningElement {
    @api recordId;
    @api taskName;
    @api description;
    @api scheduleCode;
    @api caseOfficers;
    @api category;
    @api priority;
    @api waitingPeriod;
    @api dateInserted;
    @api due;
    @api document;
    @api postTray;
    @api groupCode;
    @api otherParty;

    handleDelete() {
        // Logic to handle the task deletion
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}