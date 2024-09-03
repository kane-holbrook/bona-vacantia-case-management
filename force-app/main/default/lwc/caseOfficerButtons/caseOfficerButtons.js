import { LightningElement, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getRecord, createRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CASE_DETAIL_OBJECT from '@salesforce/schema/Case_Detail__c';
import CURRENT_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Current_Officer__c';
import DATE_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_Officer__c';
import DATE_1_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_1_Officer__c';
import DATE_2_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_2_Officer__c';
import DATE_3_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_3_Officer__c';
import DATE_4_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_4_Officer__c';
import DATE_5_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_5_Officer__c';
import DATE_6_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_6_Officer__c';
import DATE_7_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_7_Officer__c';
import DATE_8_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_8_Officer__c';
import DATE_9_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Date_9_Officer__c';
import PREVIOUS_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_1__c';
import PREVIOUS_2_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_2__c';
import PREVIOUS_3_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_3__c';
import PREVIOUS_4_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_4__c';
import PREVIOUS_5_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_5__c';
import PREVIOUS_6_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_6__c';
import PREVIOUS_7_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_7__c';
import PREVIOUS_8_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_8__c';
import PREVIOUS_9_OFFICER_FIELD from '@salesforce/schema/Case_Detail__c.Previous_9__c';
import BV_CASE_OBJECT from '@salesforce/schema/BV_Case__c';
import NAME_FIELD from '@salesforce/schema/BV_Case__c.Name';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import fetchFilesFromSharePoint from '@salesforce/apex/FileControllerGraph.fetchFilesFromSharePoint';
import { getRecordId } from 'c/sharedService';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';

export default class CaseOfficerButtons extends LightningElement {
    @track recordId;  // The BV_Case__c recordId
    @track caseDetailId; // Stores the Case_Detail__c Id for Officer History
    @track officerHistoryRecordTypeId; // Stores the Record Type Id for Officer_History
    @track adminHiddenScreenRecordTypeId; // Stores the Record Type Id for Admin Hidden Screen
    @track caseDetailRecord; // Holds the Case_Detail__c record
    @track bvCaseName; // Holds the BV_Case__c Name
    @track flowInputs = [];
    @track isChangeCaseCategoryModalOpen = false;
    @track isReopenCaseModalOpen = false;
    @track isSection27Open = false;
    @track isFlowModalOpen = false;
    @track recordTypeDeveloperName; // Holds the record type developer name

    actions = []; // Actions array will be set based on record type

    connectedCallback() {
        this.recordId = getRecordId();
        this.retrieveRecordTypeDeveloperName(); // Retrieve the record type developer name
    }

    @wire(getRecord, { recordId: '$recordId', fields: [NAME_FIELD] })
    wiredCase({ error, data }) {
        if (data) {
            this.bvCaseName = data.fields.Name.value;
        } else if (error) {
            console.error('Error fetching BV_Case__c Name:', error);
        }
    }

    @wire(getObjectInfo, { objectApiName: CASE_DETAIL_OBJECT })
    objectInfo({ data, error }) {
        if (data) {
            const recordTypes = data.recordTypeInfos;
            this.officerHistoryRecordTypeId = Object.keys(recordTypes).find(rtId => recordTypes[rtId].name === 'Officer History');
            this.adminHiddenScreenRecordTypeId = Object.keys(recordTypes).find(rtId => recordTypes[rtId].name === 'Admin - Hidden Screen');
            this.loadCaseDetailRecord();
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    async retrieveRecordTypeDeveloperName() {
        try {
            const recordTypeId = await getRecordTypeIdForRecord({ recordId: this.recordId });
            const recordTypeDeveloperName = await getRecordTypeDeveloperName({ recordTypeId });
            this.recordTypeDeveloperName = recordTypeDeveloperName;
    
            // Set the actions based on record type
            if (recordTypeDeveloperName === 'ESTA') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '4', label: 'Change case category', disabled: false },
                    { actionId: '5', label: 'Hidden Screen Controls', disabled: false },
                    { actionId: '6', label: 'LM case review', disabled: false },
                    { actionId: '7', label: 'Section 27', disabled: false }
                ];
            } else if (recordTypeDeveloperName === 'COMP') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '4', label: 'Change case category', disabled: false },
                    { actionId: '7', label: 'Change Disclaimer', disabled: false },
                    { actionId: '8', label: 'Archive Search', disabled: false }
                ];
            } else if (recordTypeDeveloperName === 'CONV' || recordTypeDeveloperName === 'GENE') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '4', label: 'Change case category', disabled: false }
                ];
            } else if (recordTypeDeveloperName === 'FOIR') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '4', label: 'Change case category', disabled: false },
                    { actionId: '9', label: 'Send to Case Officer', disabled: false },
                    { actionId: '10', label: 'Send to ILO', disabled: false },
                    { actionId: '11', label: 'ILO Approve', disabled: false },
                    { actionId: '12', label: 'HOD Approve', disabled: false },
                    { actionId: '13', label: 'Send to RCO', disabled: false }
                ];
            }
        } catch (error) {
            console.error('Error retrieving record type developer name:', error);
        }
    }

    loadCaseDetailRecord() {
        return new Promise((resolve, reject) => {
            if (this.recordId && this.officerHistoryRecordTypeId) {
                getCaseDetail({ bvCaseId: this.recordId, recordTypeId: this.officerHistoryRecordTypeId })
                    .then(result => {
                        if (result) {
                            this.caseDetailRecord = result;
                            this.caseDetailId = result.Id;
                        }
                        resolve(result);
                    })
                    .catch(error => {
                        console.error('Error loading Case_Detail__c record:', error);
                        reject(error);
                    });
            } else {
                resolve(null);
            }
        });
    }

    handleActionClick(event) {
        const actionName = event.target.label;
        console.log(`Button clicked: ${actionName}`);
        
        if (actionName === 'Re-allocate case') {
            this.template.querySelector('c-re-allocate-case').openModal();
        } else if (actionName === 'Change case category') {
            this.flowInputs = [
                {
                    name: 'recordId', 
                    type: 'String', 
                    value: this.recordId
                }
            ];
            this.isChangeCaseCategoryModalOpen = true;
        } else if (actionName === 'Re-open case') {
            this.flowInputs = [
                {
                    name: 'caseId',
                    type: 'String',
                    value: this.recordId
                }
            ];
            this.isReopenCaseModalOpen = true;
        } else if (actionName === 'Section 27') {
            this.flowInputs = [
                {
                    name: 'recordId', 
                    type: 'String', 
                    value: this.recordId
                }
            ];
            this.isSection27Open = true;
        } else if (actionName === 'Hidden Screen Controls') {
            this.template.querySelector('c-hidden-screen-controls').openModal();
        } else if (actionName === 'LM case review') {
            // Fetch files from SharePoint for LMREV document type
            const folderPath = `Templates`;
            const documentType = 'LMREV';
    
            fetchFilesFromSharePoint({ folderPath: folderPath, documentType: documentType })
                .then(result => {
                    console.log('Files from sharepoint:', result);
                    if (result && result.length > 0) {
                        const selectedDocument = result[0];
    
                        // Populate flowInputs with selectedDocumentId and selectedDocumentType
                        this.flowInputs = [
                            {
                                name: 'selectedDocumentId',
                                type: 'String',
                                value: selectedDocument.id
                            },
                            {
                                name: 'selectedDocumentType',
                                type: 'String',
                                value: documentType
                            }
                        ];
    
                        // Open the modal or flow for LM case review
                        this.isFlowModalOpen = true;
                    } else {
                        console.warn('No files found for LMREV document type');
                    }
                })
                .catch(error => {
                    console.error('Error fetching files from SharePoint:', error);
                });
        } else if (actionName === 'Change Disclaimer') {
            // Logic for Change Disclaimer action
            console.log('Change Disclaimer action triggered');
            // Add any specific handling logic here
        } else if (actionName === 'Archive Search') {
            this.handleArchiveSearch(); // Invoke the email sending method for Archive Search
        }
    }

    handleArchiveSearch() {
        // If caseDetailRecord or Current_Officer__c is undefined/null, set it to "Unallocated"
        const currentOfficer = this.caseDetailRecord && this.caseDetailRecord.Current_Officer__c 
            ? this.caseDetailRecord.Current_Officer__c 
            : 'Unallocated';
    
        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({
            HtmlBody: `
                <p>The company records for abc do not appear to be on Companies House Direct. I would be grateful if you could please let me have the following information concerning the company:</p>
                <ol>
                    <li>The company number.</li>
                    <li>The last registered office.</li>
                    <li>The date of dissolution (if dissolved).</li>
                    <li>The Act and section pursuant to which it was dissolved (if appropriate).</li>
                    <li>A copy of the Certificate of Dissolution.</li>
                    <li>Details of any former names of the company, together with copies of any Certificates of Change of name.</li>
                    <li>Full names and addresses of the former members and officers of the company.</li>
                </ol>
                <p>If, however, the company's records are on DVD, would you please forward the DVD to me. Please quote my reference of ${this.bvCaseName} in any correspondence and debit our account number S0003668 accordingly. Thank you for your assistance.</p>
                <p>${currentOfficer}<br>for the Treasury Solicitor (BV)</p>
            `,
            Subject: `Archive search request - ${this.bvCaseName}`,
            ToAddress: 'ajones@companieshouse.gsi.gov.uk',
            CcAddress: 'Group4@governmentlegal.gov.uk'
        });
    }

    handleCaseOfficerSave(event) {
        const newCaseOfficer = event.detail;

        this.loadCaseDetailRecord().then(() => {
            if (this.caseDetailId) {
                // Update existing Case_Detail__c record
                this.updateCaseDetail(newCaseOfficer);
            } else {
                // Create new Case_Detail__c record
                this.createCaseDetail(newCaseOfficer);
            }
        });
    }

    createCaseDetail(newCaseOfficer) {
        const fields = {};
        fields[CURRENT_OFFICER_FIELD.fieldApiName] = newCaseOfficer;
        fields[DATE_OFFICER_FIELD.fieldApiName] = new Date().toISOString();
        fields['BV_Case__c'] = this.recordId;
        fields['RecordTypeId'] = this.officerHistoryRecordTypeId; // Use the dynamically retrieved Record Type Id

        const recordInput = { apiName: CASE_DETAIL_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                this.caseDetailId = result.id;
                const event = new CustomEvent('caseofficersaved', {
                    detail: { recordId: this.recordId },
                    bubbles: true, // Allow the event to bubble up
                    composed: true // Allow the event to cross the shadow DOM boundary
                });
                this.dispatchEvent(event);
                console.log('Case_Detail__c created successfully with Id: ' + this.caseDetailId);
                // Optionally, handle further actions like notifying the user
            })
            .catch(error => {
                console.error('Error creating Case_Detail__c:', error);
                // Optionally, handle error like showing an error message to the user
            });
    }

    updateCaseDetail(newCaseOfficer) {
        const fields = {};
        fields['Id'] = this.caseDetailId;

        const currentOfficer = this.caseDetailRecord.Current_Officer__c;
        const currentDateOfficer = this.caseDetailRecord.Date_Officer__c;

        if (currentOfficer) {
            fields[PREVIOUS_9_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_8__c;
            fields[DATE_9_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_8_Officer__c;

            fields[PREVIOUS_8_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_7__c;
            fields[DATE_8_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_7_Officer__c;

            fields[PREVIOUS_7_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_6__c;
            fields[DATE_7_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_6_Officer__c;

            fields[PREVIOUS_6_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_5__c;
            fields[DATE_6_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_5_Officer__c;

            fields[PREVIOUS_5_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_4__c;
            fields[DATE_5_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_4_Officer__c;

            fields[PREVIOUS_4_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_3__c;
            fields[DATE_4_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_3_Officer__c;

            fields[PREVIOUS_3_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_2__c;
            fields[DATE_3_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_2_Officer__c;

            fields[PREVIOUS_2_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Previous_1__c;
            fields[DATE_2_OFFICER_FIELD.fieldApiName] = this.caseDetailRecord.Date_1_Officer__c;

            fields[PREVIOUS_OFFICER_FIELD.fieldApiName] = currentOfficer;
            fields[DATE_1_OFFICER_FIELD.fieldApiName] = currentDateOfficer;
        }

        // Set the new current officer and the current date
        fields[CURRENT_OFFICER_FIELD.fieldApiName] = newCaseOfficer;
        fields[DATE_OFFICER_FIELD.fieldApiName] = new Date().toISOString();

        const recordInput = { fields };
        updateRecord(recordInput)
            .then(() => {
                console.log('Case_Detail__c updated successfully');
                const event = new CustomEvent('caseofficersaved', {
                    detail: { recordId: this.recordId },
                    bubbles: true, // Allow the event to bubble up
                    composed: true // Allow the event to cross the shadow DOM boundary
                });
                this.dispatchEvent(event);
                // Optionally, handle further actions like notifying the user
            })
            .catch(error => {
                console.error('Error updating Case_Detail__c:', error);
                // Optionally, handle error like showing an error message to the user
            });
    }

    closeAddAccrualModal() {
        this.isAddAccrualModalOpen = false;
    }

    closeReverseAccrualModal() {
        this.isReverseAccrualModalOpen = false;
    }

    closeChangeCaseCategoryModal() {
        this.isChangeCaseCategoryModalOpen = false;
    }

    closeSection27Modal() {
        this.isSection27Open = false;
    }

    handleFlowClose() {
        // Close the flow modal
        this.isFlowModalOpen = false;
    }

    closeReopenCaseModal() {
        this.isReopenCaseModalOpen = false;
    }
    
    handleFlowStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            this.isChangeCaseCategoryModalOpen = false;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Case category changed successfully',
                    variant: 'success'
                })
            );
        }
    }

    handleHiddenScreenControlsSave() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Hidden Screen Controls saved successfully',
                variant: 'success'
            })
        );
    }
}