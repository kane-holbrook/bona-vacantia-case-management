import { LightningElement } from 'lwc';

export default class TabContent extends LightningElement {
    handleCaseOfficerSaved() {
        const caseOfficerHistory = this.template.querySelector('c-case-officer-history');
        if (caseOfficerHistory) {
            caseOfficerHistory.refreshCaseDetail();
        }
    }
}