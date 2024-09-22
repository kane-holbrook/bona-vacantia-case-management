import { LightningElement, api, track, wire } from 'lwc';
import searchUsers from '@salesforce/apex/TaskController.searchUsers';
import getCurrentUser from '@salesforce/apex/TaskController.getCurrentUser';

export default class caseOfficerSelector extends LightningElement {
    @api searchTerm = ''; // The search term entered by the user
    @track filteredCaseOfficerOptions = []; // List of filtered case officers
    @api newCaseOfficer = ''; // The selected case officer
    @api selectedCaseOfficer;

    connectedCallback() {
        this.fetchCurrentUser();
    }

    fetchCurrentUser() {
        getCurrentUser()
            .then((result) => {
                this.newCaseOfficer = result.Name;
                this.selectedCaseOfficer = result.Id;
                this.searchTerm = result.Name;
            })
            .catch((error) => {
                console.error('Error fetching current user:', error);
            });
    }

    handleInputChange(event) {
        this.newCaseOfficer = event.target.value;
    }

    handleSearchTermChange(event) {
        this.searchTerm = event.target.value;
        this.fetchUsers();
    }

    fetchUsers() {
        if (this.searchTerm.length > 2) {
            searchUsers({ searchTerm: this.searchTerm })
                .then((result) => {
                    this.filteredCaseOfficerOptions = result.map((user) => {
                        return { label: user.Name, value: user.Name, id: user.Id };
                    });
                })
                .catch((error) => {
                    console.error('Error fetching users:', error);
                });
        } else {
            this.filteredCaseOfficerOptions = [];
        }
    }

    selectCaseOfficer(event) {
        const selectedCaseOfficerName = event.currentTarget.dataset.label;
        const selectedCaseOfficerId = event.currentTarget.dataset.value;
        const CaseOfficerIdSelect = event.currentTarget.dataset.id;
        this.newCaseOfficer = selectedCaseOfficerId;
        this.selectedCaseOfficer = CaseOfficerIdSelect;
        this.searchTerm = selectedCaseOfficerName;
        this.filteredCaseOfficerOptions = [];
    }

    get shouldShowDropdown() {
        return this.searchTerm && this.searchTerm.length > 2 && this.filteredCaseOfficerOptions.length > 0;
    }
}