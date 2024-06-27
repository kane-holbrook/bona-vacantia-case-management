import { LightningElement, track } from 'lwc';

export default class TaskDetail extends LightningElement {
    @track editSubTask = false;
    @track deleteTask = false;
    @track changeDueDateTask = false;
    @track editCommentsTask = false;

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

    onChangeDueDateTask() {
        this.changeDueDateTask = true;
    }

    onChangeDueDateTaskClose() {
        this.changeDueDateTask = false;
    }

    onEditCommentsTask() {
        this.editCommentsTask = true;
    }

    onEditCommentsTaskClose() {
        this.editCommentsTask = false;
    }
}