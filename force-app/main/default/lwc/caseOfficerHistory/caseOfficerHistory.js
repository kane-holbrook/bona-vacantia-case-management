import { LightningElement, track } from 'lwc';
import getCaseOwnerId from '@salesforce/apex/HistoryController.getCaseOwnerId';
import getUserNames from '@salesforce/apex/HistoryController.getUserNames';
import { getRecordId } from 'c/sharedService';

export default class CaseOfficerHistory extends LightningElement {
    @track currentOfficer;
    @track currentOfficerDate;
    @track previous1Date;
    @track previous2Date;
    @track previous3Date;
    @track previous4Date;
    @track previous5Date;
    @track previous6Date;
    @track previous7Date;
    @track previous8Date;
    @track previous9Date;
    @track putAway;
    @track reopened;
    bvCaseId;

    connectedCallback() {
        this.bvCaseId = getRecordId();
        if (this.bvCaseId) {
            this.fetchCaseOwner(this.bvCaseId);
        }
    }

    fetchCaseOwner(caseId) {
        getCaseOwnerId({ caseId })
            .then(ownerId => {
                this.currentOfficer = ownerId;
                this.fetchCaseOfficerName(this.currentOfficer);
            })
            .catch(error => {
                console.error('Error fetching case owner:', error);
            });
    }

    fetchCaseOfficerName(userId) {
        if (userId) {
            getUserNames({ userIds: [userId] })
                .then(result => {
                    this.currentOfficer = result[userId];
                })
                .catch(error => {
                    console.error('Error fetching user names:', error);
                });
        } else {
            this.currentOfficer = '';
        }
    }

    handleDateChange(event) {
        const field = event.target.label.toLowerCase().replace(/\s/g, '');
        this[field] = event.target.value;
    }
}