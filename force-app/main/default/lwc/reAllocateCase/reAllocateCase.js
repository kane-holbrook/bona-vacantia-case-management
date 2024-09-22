import { LightningElement, api, track, wire } from 'lwc';
import searchUsers from '@salesforce/apex/TaskController.searchUsers';

export default class ReAllocateCase extends LightningElement {
    @track isModalOpen = false;
    @track newCaseOfficer = ''; // This will now store the selected officer's name
    @track newCaseOfficerId = ''; // Add this line to store the User Id
    @track searchTerm = '';
    @track filteredCaseOfficerOptions = [];

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
            detail: {
                name: this.newCaseOfficer,
                id: this.newCaseOfficerId
            }
        });

        this.dispatchEvent(selectedEvent);
        this.closeModal();
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
                        return { label: user.Name, value: user.Id };
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
        this.newCaseOfficer = selectedCaseOfficerName;
        this.newCaseOfficerId = selectedCaseOfficerId;
        this.searchTerm = selectedCaseOfficerName;
        this.filteredCaseOfficerOptions = [];
    }

    get shouldShowDropdown() {
        return this.searchTerm && this.searchTerm.length > 2 && this.filteredCaseOfficerOptions.length > 0;
    }
}