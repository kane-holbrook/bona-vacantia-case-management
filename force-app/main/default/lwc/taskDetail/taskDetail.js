import { LightningElement, track } from 'lwc';

export default class TaskDetail extends LightningElement {
    @track editSubTask = false;
    @track deleteTask = false;

    onEditSubTask() {
        this.editSubTask = true;
    }

    onEditTaskClose() {
        this.editSubTask = false;
    }

    onDeleteTask() {
        this.deleteTask = true;
    }

    onDeleteTaskClose() {
        this.deleteTask = false;
    }
}