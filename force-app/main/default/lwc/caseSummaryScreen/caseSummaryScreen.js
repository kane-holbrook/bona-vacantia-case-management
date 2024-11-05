import { LightningElement, api, wire } from 'lwc';
import getCaseSummaryData from '@salesforce/apex/CaseSummaryController.getCaseSummaryData';

export default class CaseSummaryScreen extends LightningElement {
    @api recordId;

    keyName = '';
    keyAddress = '';
    caseType = '';
    caseOfficer = '';
    dateOpened = ''; 
    firstActionDate = '';
    allocatedDate = '';
    onReportTo = '';
    referredTo = '';
    referredToDate = '';
    lastAction = '';
    lastActionDate = '';
    currentStatus = '';
    currentStatusDate = '';
    formerRef = '';
    detailsComplete = '';
    dateCaseLastReviewed = '';
    dateOfLastLmReview = '';
    dateOfLastCoReview = '';

    @wire(getCaseSummaryData, { caseId: '$recordId' })
    wiredCaseSummary({ error, data }) {
        if (data) { 
            this.keyName = data.keyName || '';
            this.keyAddress = data.keyAddress || '';
            this.caseType = data.caseType || '';
            this.caseOfficer = data.caseOfficer || '';
            this.allocatedDate = this.formatDate(data.allocatedDate);
            this.dateOpened = this.formatDate(data.dateOpened);
            this.firstActionDate = this.formatDate(data.firstActionDate);
            this.onReportTo = data.onReportTo || '';
            this.referredTo = data.referredTo || '';
            this.referredToDate = this.formatDate(data.referredToDate);
            this.lastAction = data.lastAction || '';
            this.lastActionDate = this.formatDate(data.lastActionDate);
            this.currentStatus = data.currentStatus || '';
            this.currentStatusDate = this.formatDate(data.currentStatusDate);
            this.formerRef = data.formerRef || '';
            this.detailsComplete = data.detailsComplete || '';
            this.dateCaseLastReviewed = this.formatDate(data.dateCaseLastReviewed);
            this.dateOfLastLmReview = this.formatDate(data.dateOfLastLmReview);
            this.dateOfLastCoReview = this.formatDate(data.dateOfLastCoReview);
        } else if (error) {
            console.error(error);
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}