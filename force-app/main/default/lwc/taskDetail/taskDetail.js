import { LightningElement, track } from 'lwc';

export default class TaskDetail extends LightningElement {
    @track editSubTask = false;

    onEditSubTask() {
        this.editSubTask = true;
    }

    onEditTaskClose() {
        this.editSubTask = false;
    }
}