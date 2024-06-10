import { LightningElement, track, wire} from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getTasks from '@salesforce/apex/BV_TasklistQuery.getTasks';

const actions = [
    {label: 'View / Edit', name: 'viewedit'},
    {label: 'Delete', name: 'delete'},
];
 
export default class TaskList extends NavigationMixin(LightningElement) {

    @track data = [];
    @track columns = [
        {
            label: 'Due', fieldName: 'Due', type: 'date', editable: true, cellAttributes: { style: { fieldName: 'priorityStyle' } },
            typeAttributes: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
        },
        //{ label: 'Case number', fieldName: 'CaseNumber', type: 'text', editable: true, cellAttributes: { style: { fieldName: 'priorityStyle' } } },
        { label: 'Description', fieldName: 'Description', type: 'text', editable: true, cellAttributes: { style: { fieldName: 'priorityStyle' } } },
        { label: 'Priority', fieldName: 'Priority', type: 'picklist', editable: true, cellAttributes: { style: { fieldName: 'priorityStyle' }, iconName: { fieldName: 'priorityIcon' }, iconPosition: 'right' } },
        //{ label: 'Case officer', fieldName: 'CaseOfficer', type: 'text', editable: true, cellAttributes: { style: { fieldName: 'priorityStyle' } } },
    ];

    columnWidthPercentages = [0.3, 0.4, 0.3];

    initialRecords;
    searchString = '';
    
    taskCardInformation = '';
    sortType = 'Due';
    filterType = 'Open tasks';

    @wire(getTasks)
    wiredTasks({ error, data }) {
        if (data) {
            this.processData(data);
            this.initialRecords = data;
        } else if (error) {
            this.error = error;
            this.data = undefined;
        }
    }

    processData(data) {
        this.data = data.map(task => ({
            Id: task.Id,
            Due: task.Due__c,
            CaseNumber: task.BV_Case_Lookup__r.Name,
            Description: task.Description__c,
            CaseOfficer: task.BV_Case_Lookup__r.Case_Officer__c,
            Priority: task.Priority__c,
            priorityStyle: this.getPriorityStyling(task.Priority__c),
            priorityIcon: this.getPriorityIcon(task.Priority__c)
        }));

        this.updateColumnsWidth();
        this.updateTaskCardInformation();
    }

    handleSearchChange(event) {
        this.searchString = event.detail.value.toLowerCase();
        this.filterTasks();
    }

    filterTasks() {
        if (this.searchString) {
            const filteredTasks = this.initialRecords.filter(rec => {
                const valuesArray = Object.values(rec);
                console.log('Values array: ' + valuesArray)
                return valuesArray.some(val => {
                    const strVal = String(val);
                    return strVal && strVal.toLowerCase().includes(this.searchString);
                });
            });

            this.processData(filteredTasks);
        } else {
            this.processData(this.initialRecords);
        }
    }

    getPriorityStyling(priority) {
        switch (priority) {
            case 'High':
                return 'background: #EBF7E6;';
            case 'Critical':
                return 'background: #FEF1EE;';
            default:
                return '';
        }
    }

    getPriorityIcon(priority) {
        switch (priority) {
            case 'High':
                return 'utility:info_alt';
            case 'Critical':
                return 'utility:info';
            default:
                return '';
        }
    }

    connectedCallback() {
        window.addEventListener('resize', this.updateColumnsWidth.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.updateColumnsWidth.bind(this));
    }

    updateColumnsWidth() {
        const table = this.template.querySelector('.custom-datatable');
        if (table) {
            const tableWidth = table.offsetWidth;
            this.columns = this.columns.map((column, index) => {
                const widthPercentage = this.columnWidthPercentages[index];
                const widthPixels = Math.round(tableWidth * widthPercentage);
                return { ...column, initialWidth: widthPixels };
            });
        }
    }

    updateTaskCardInformation() {
        this.taskCardInformation = `${this.data.length} items - Sorted by ${this.sortType} - Filtered by ${this.filterType}`;
    }
}