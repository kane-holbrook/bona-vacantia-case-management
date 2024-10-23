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
import ILO_FIELD from '@salesforce/schema/BV_Case__c.Ilo__c';
import FOI_NO_FIELD from '@salesforce/schema/BV_Case__c.Foi_No__c';
import APPLICANT_FIELD from '@salesforce/schema/BV_Case__c.Applicant__c';
import REPLY_DUE_FIELD from '@salesforce/schema/BV_Case__c.Reply_Due__c';
import CASE_NAME_FIELD from '@salesforce/schema/BV_Case__c.Case_Name__c';
import CASE_NUMBER_FIELD from '@salesforce/schema/BV_Case__c.Case_Number__c';
import OWNER_ID_FIELD from '@salesforce/schema/BV_Case__c.OwnerId';
import getCaseDetail from '@salesforce/apex/CaseOfficerController.getCaseDetail';
import fetchFilesFromSharePoint from '@salesforce/apex/FileControllerGraph.fetchFilesFromSharePoint';
import { getRecordId } from 'c/sharedService';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';
import USER_ID from '@salesforce/user/Id';
import USER_NAME_FIELD from '@salesforce/schema/User.Name';

export default class CaseOfficerButtons extends LightningElement {
    @track recordId;  // The BV_Case__c recordId
    @track caseDetailId; // Stores the Case_Detail__c Id for Officer History
    @track officerHistoryRecordTypeId; // Stores the Record Type Id for Officer_History
    @track adminHiddenScreenRecordTypeId; // Stores the Record Type Id for Admin Hidden Screen
    @track caseDetailRecord; // Holds the Case_Detail__c record
    @track bvCaseName; // Holds the BV_Case__c Name
    @track ilo; // Holds the ILO from BV_Case__c
    @track foiNo; // Holds the FOI No from BV_Case__c
    @track applicant; // Holds the Applicant from BV_Case__c
    @track replyDue; // Holds the Reply Due from BV_Case__c
    @track caseName; // Holds the Case Name from BV_Case__c
    @track caseNumber; // Holds the Case Number from BV_Case__c
    @track currentUserFullName; // Holds the current user's full name
    @track flowInputs = [];
    @track isChangeCaseCategoryModalOpen = false;
    @track isReopenCaseModalOpen = false;
    @track isSection27Open = false;
    @track isFlowModalOpen = false;
    @track isILOApproveModalOpen = false;
    @track isHODApproveModalOpen = false;
    @track isChangeDisclaimerDateOpen = false;
    @track isPutAwayModalOpen = false;
    @track recordTypeDeveloperName; // Holds the record type developer name
    @track isEstates = false;
    @track documentType; // Holds the document type for LM case review
    @track putAwayFlowApiName = 'Put_Away_a_Case'; // Default flow API name

    actions = []; // Actions array will be set based on record type

    connectedCallback() {
        this.recordId = getRecordId();
        this.retrieveRecordTypeDeveloperName(); // Retrieve the record type developer name
    }

    @wire(getRecord, { recordId: USER_ID, fields: [USER_NAME_FIELD] })
    wireUser({ error, data }) {
        if (data) {
            this.currentUserFullName = data.fields.Name.value;
        } else if (error) {
            console.error('Error fetching user data:', error);
        }
    }

    @wire(getRecord, { recordId: '$recordId', fields: [NAME_FIELD, ILO_FIELD, FOI_NO_FIELD, APPLICANT_FIELD, REPLY_DUE_FIELD, CASE_NAME_FIELD, CASE_NUMBER_FIELD] })
    wiredCase({ error, data }) {
        if (data) {
            this.bvCaseName = data.fields.Name.value;
            this.ilo = data.fields.Ilo__c.value;
            this.foiNo = data.fields.Foi_No__c.value;
            this.applicant = data.fields.Applicant__c.value;
            this.replyDue = data.fields.Reply_Due__c.value;
            this.caseName = data.fields.Case_Name__c.value;
            this.caseNumber = data.fields.Case_Number__c.value;
        } else if (error) {
            console.error('Error fetching BV_Case__c data:', error);
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
    
            // Set the actions and document type based on record type
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
                this.isEstates = true;
                this.documentType = 'LMREV';
            } else if (recordTypeDeveloperName === 'COMP') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '4', label: 'Change case category', disabled: false },
                    { actionId: '7', label: 'Change Disclaimer', disabled: false },
                    { actionId: '8', label: 'Archive Search', disabled: false },
                    { actionId: '6', label: 'LM case review', disabled: false }
                ];
                this.documentType = 'LMCOMP';
            } else if (recordTypeDeveloperName === 'CONV') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '4', label: 'Change case category', disabled: false },
                    { actionId: '6', label: 'LM case review', disabled: false }
                ];
                this.documentType = 'LMCONV';
            } else if (recordTypeDeveloperName === 'GENE') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false }
                ];
            } else if (recordTypeDeveloperName === 'FOIR') {
                this.actions = [
                    { actionId: '1', label: 'Put away', disabled: false },
                    { actionId: '2', label: 'Re-open case', disabled: false },
                    { actionId: '3', label: 'Re-allocate case', disabled: false },
                    { actionId: '9', label: 'Send to Case Officer', disabled: false },
                    { actionId: '10', label: 'ILO Approve', disabled: false },
                    { actionId: '11', label: 'HOD Approve', disabled: false },
                    { actionId: '12', label: 'Send to ILO', disabled: false },
                    { actionId: '13', label: 'Send to RCO', disabled: false },
                    { actionId: '14', label: 'Hidden Screen Controls', disabled: false }
                ];
                this.isEstates = false;
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
                },
                {
                    name: 'recordType',
                    type: 'String',
                    value: this.recordTypeDeveloperName
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
            const hiddenScreenControlsComponent = this.template.querySelector('c-hidden-screen-controls');
            hiddenScreenControlsComponent.bvCaseId = this.recordId;
            hiddenScreenControlsComponent.recordTypeId = this.adminHiddenScreenRecordTypeId;
            hiddenScreenControlsComponent.isEstates = this.isEstates;
            hiddenScreenControlsComponent.openModal();
        } else if (actionName === 'LM case review') {
            // Fetch files from SharePoint for the appropriate document type
            const folderPath = `Templates`;
            const documentType = this.documentType || 'LMREV'; // Default to LMREV if not set

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
                        console.warn('No files found for document type:', documentType);
                    }
                })
                .catch(error => {
                    console.error('Error fetching files from SharePoint:', error);
                });
        } else if (actionName === 'Change Disclaimer') {
            this.flowInputs = [
                {
                    name: 'caseId',
                    type: 'String',
                    value: this.recordId
                }
            ];
            this.isChangeDisclaimerDateOpen = true;
        } else if (actionName === 'Archive Search') {
            this.handleArchiveSearch(); // Invoke the email sending method for Archive Search
        } else if (actionName === 'Send to ILO') {
            this.handleSendToILO(); // Invoke the email sending method for Send to ILO
        } else if (actionName === 'Send to Case Officer') {
            this.handleSendToCaseOfficer(); // Invoke the email sending method for Send to Case Officer
        } else if (actionName === 'Send to RCO') {
            this.handleSendToRCO();
        } else if (actionName === 'ILO Approve') {
            this.flowInputs = [
                {
                    name: 'caseId',
                    type: 'String',
                    value: this.recordId
                }
            ];
            this.isILOApproveModalOpen = true;
        } else if (actionName === 'HOD Approve') {
            this.flowInputs = [
                {
                    name: 'caseId',
                    type: 'String',
                    value: this.recordId
                }
            ];
            this.isHODApproveModalOpen = true;
        } else if (actionName === 'Put away') {
            this.flowInputs = [
                {
                    name: 'caseId',
                    type: 'String',
                    value: this.recordId
                }
            ];
            if (this.recordTypeDeveloperName !== 'FOIR' && this.recordTypeDeveloperName !== 'GENE' && this.recordTypeDeveloperName !== 'COMP' && this.recordTypeDeveloperName !== 'CONV') {
                this.flowInputs.push({
                    name: 'caseName',
                    type: 'String',
                    value: this.bvCaseName
                });
            }
            this.isPutAwayModalOpen = true;
            // Set the appropriate flow API name based on recordTypeDeveloperName
            switch (this.recordTypeDeveloperName) {
                case 'COMP':
                    this.putAwayFlowApiName = 'Put_Away_a_Case_Companies';
                    break;
                case 'ESTA':
                    this.putAwayFlowApiName = 'Put_Away_a_Case';
                    break;
                case 'GENE':
                    this.putAwayFlowApiName = 'Put_Away_a_Case_General';
                    break;
                case 'FOIR':
                    this.putAwayFlowApiName = 'Put_Away_a_Case_Freedom_of_Information';
                    break;
                case 'CONV':
                    this.putAwayFlowApiName = 'Put_Away_a_Case_Conveyancing';
                    break;
                default:
                    this.putAwayFlowApiName = 'Put_Away_a_Case';
            }
        }
    }

    handleArchiveSearch() {
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
                <p>${this.currentUserFullName}<br>for the Treasury Solicitor (BV)</p>
            `,
            Subject: `Archive search request - ${this.bvCaseName}`,
            ToAddress: 'ajones@companieshouse.gsi.gov.uk',
            CcAddress: 'Group4@governmentlegal.gov.uk'
        });
    }

    handleSendToILO() {
        const ILOFirstName = this.ilo ? this.ilo.split(' ')[0] : 'ILO'; // Get first name if available

        // We convert the reply due date to the correct format
        let replyDue = new Date(this.replyDue).toLocaleDateString('en-GB');

        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({
            HtmlBody: `
                <p>${ILOFirstName}</p>
                <p>An information sheet and a draft response have been created in respect of the above FOI request.</p>
                <p>The reference number of this request is BVFOI/${this.foiNo} and these documents can be found in the Solcase history.</p>
                <p>The response is due by ${replyDue}.</p>
                <p>Regards,</p>
                <p>${this.currentUserFullName || 'FOI Team'}</p>
            `,
            Subject: `FOI request - BVFOI/${this.foiNo} - ${this.applicant} re ${this.caseName} - Response date: ${replyDue}`,
            ToAddress: this.ilo,
            CcAddress: 'BVFOI@governmentlegal.gov.uk'
        });
    }

    handleSendToCaseOfficer() {
        const caseOfficerName = this.caseDetailRecord && this.caseDetailRecord.Current_Officer__c 
            ? this.caseDetailRecord.Current_Officer__c 
            : 'Unallocated';

        // We convert the reply due date to the correct format
        let replyDue = new Date(this.replyDue).toLocaleDateString('en-GB');

        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({
            HtmlBody: `
                <p>A new FOI file has been allocated to you.</p>
                <p>The request is under reference number BVFOI/${this.foiNo} and has been received from ${this.applicant}.</p>
                <p>The request relates to ${this.caseName} (${this.caseNumber}).</p>
                <p>The response deadline is ${replyDue}</p>
                <p>Please email ${this.ilo} once you have prepared a draft response.</p>
                <p>Regards</p>
                <p>${this.currentUserFullName || 'FOI Team'}</p>
            `,
            Subject: `New FOI Request Assigned - BVFOI/${this.foiNo} - ${this.applicant}`,
            //ToAddress: caseOfficerName, // Assuming the case officer name is their email address
            CcAddress: 'BVFOI@governmentlegal.gov.uk'
        });
    }

    handleSendToRCO() {
        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
        emailQuickActionComponent.invoke({
            HtmlBody: `
                <p>This FOI has been withdrawn and the case can now be closed.</p>
                <p>Regards</p>
                <p>${this.currentUserFullName}</p>
            `,
            Subject: `BVFOI/${this.foiNo}`,
            ToAddress: 'Laura Antoniou',
            CcAddress: 'BVFOI@governmentlegal.gov.uk'
        });
    }

    handleCaseOfficerSave(event) {
        const { name: newCaseOfficer, id: newOwnerId } = event.detail;

        this.loadCaseDetailRecord().then(() => {
            if (this.caseDetailId) {
                // Update existing Case_Detail__c record
                this.updateCaseDetail(newCaseOfficer, newOwnerId);
            } else {
                // Create new Case_Detail__c record
                this.createCaseDetail(newCaseOfficer, newOwnerId);
            }
        });
    }

    createCaseDetail(newCaseOfficer, newOwnerId) {
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
                // Now update the BV_Case__c record to change the owner
                this.updateBVCaseOwner(newOwnerId);
            })
            .catch(error => {
                console.error('Error creating Case_Detail__c:', error);
                // Optionally, handle error like showing an error message to the user
            });
    }

    updateCaseDetail(newCaseOfficer, newOwnerId) {
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
                // Now update the BV_Case__c record to change the owner
                this.updateBVCaseOwner(newOwnerId);
            })
            .catch(error => {
                console.error('Error updating Case_Detail__c:', error);
                // Optionally, handle error like showing an error message to the user
            });
    }

    updateBVCaseOwner(newOwnerId) {
        const fields = {};
        fields['Id'] = this.recordId;
        fields[OWNER_ID_FIELD.fieldApiName] = newOwnerId;

        const recordInput = { fields };
        updateRecord(recordInput)
            .then(() => {
                console.log('BV_Case__c owner updated successfully');
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Case Officer and Owner updated successfully',
                        variant: 'success',
                        mode: 'sticky'
                    })
                );
                // Dispatch the caseofficersaved event
                this.dispatchEvent(new CustomEvent('flowfinished', {
                    detail: { recordId: this.recordId },
                    bubbles: true,
                    composed: true
                }));
            })
            .catch(error => {
                console.error('Error updating BV_Case__c owner:', error);
                // Handle error
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

    closeChangeDisclaimerDate() {
        this.isChangeDisclaimerDateOpen = false;
    }

    closeILOApproveModal() {
        this.isILOApproveModalOpen = false;
    }

    closeHODApproveModal() {
        this.isHODApproveModalOpen = false;
    }

    handlePutAwayClose() {
        this.isPutAwayModalOpen = false;
    }
    
    handleFlowStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            let title = 'Success';
            let message = '';
            let modalToClose = '';

            // Check for the output variable related to confirmation
            const outputVariables = event.detail.outputVariables;
            let flowOutput = {};  // Initialize a place to store flow outputs

            // Loop through outputVariables and assign key-value pairs to flowOutput
            outputVariables.forEach(variable => {
                flowOutput[variable.name] = variable.value;
            });

            // Check if the confirmAction (or similar variable) is 'Yes'
            const isConfirmed = flowOutput['confirmAction'] === 'Yes';
            
            switch (event.target.flowApiName) {
                case 'Change_case_category_flow':
                    if (isConfirmed) {
                        message = 'Case category changed successfully'; 
                    }
                    modalToClose = 'isChangeCaseCategoryModalOpen';
                    break;
                case 'Re_open_a_case':
                    if (isConfirmed) {
                        message = 'Case reopened successfully';
                    }
                    modalToClose = 'isReopenCaseModalOpen';
                    break;
                case 'Change_disclaimer_date':
                    message = 'Disclaimer date changed successfully';
                    modalToClose = 'isChangeDisclaimerDateOpen';
                    break;
                case 'Section_27_Flow':
                    message = 'Section 27 process completed successfully';
                    modalToClose = 'isSection27Open';
                    break;
                case 'Generate_a_document':
                    message = 'Document generated successfully';
                    modalToClose = 'isFlowModalOpen';
                    break;
                case 'Put_Away_a_Case':
                case 'Put_Away_a_Case_Companies':
                case 'Put_Away_a_Case_General':
                case 'Put_Away_a_Case_Freedom_of_Information':
                case 'Put_Away_a_Case_Conveyancing':
                    if (isConfirmed){
                        message = 'Case put away successfully';
                    }
                    modalToClose = 'isPutAwayModalOpen';
                    break;
                case 'ILO_Approve':
                message = 'ILO approval process completed successfully';
                modalToClose = 'isILOApproveModalOpen';

                // Pass the captured flow output to the method that generates and sends the email
                this.sendILOApproveEmail(flowOutput);
                break;
                case 'HoD_Approve':
                message = 'HOD approval process completed successfully';
                modalToClose = 'isHODApproveModalOpen';

                this.sendHODApproveEmail();
                default:
                    message = 'Operation completed successfully';
            }

            // Dispatch a custom event to refresh the Case Officer History
            console.log('dispatching event 1');
            this.dispatchEvent(new CustomEvent('flowfinished', {
                bubbles: true,
                composed: true
            }));

            if (message != ''){
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: title,
                        message: message,
                        variant: 'success',
                        mode: 'sticky'
                    })
                );
            }

            if (modalToClose) {
                this[modalToClose] = false;
            }

        }
    }

    sendILOApproveEmail(flowOutput) {
        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');
    
        let message = 'I am content with the draft response to the above FOI request.';
        let tf06 = '';
    
        if (flowOutput['AmendmentsMade'] === 'Yes') {
            tf06 = 'I have made amendments to the draft. These can be found in the most recent version of the document in the Solcase history.';
        }
    
        let emailBody = '';
    
        let replyDue = new Date(this.replyDue).toLocaleDateString('en-GB');
    
        if (flowOutput['requireCaroline'] === 'No') {
            emailBody = `
                <p>I approve this FOI response.</p>
                <p>This does not need to be seen by Head of Division.</p>
                <p>Regards,</p>
                <p>${this.currentUserFullName || 'FOI Team'}</p>
            `;
        } else {
            emailBody = `
                <p>${message} ${tf06}</p>
                <p>Please use the 'Send to HoD' button on the Front Cover for Head of Division's approval.</p>
                <p>Regards,</p>
                <p>${this.currentUserFullName || 'FOI Team'}</p>
            `;
        }
    
        // Send the email using c-email-quick-action
        emailQuickActionComponent.invoke({
            HtmlBody: emailBody,
            Subject: `RE: FOI Request - BVFOI/${this.foiNo} - Response Date: ${replyDue}`,
            ToAddress: this.ilo,  // Assuming ILO is the recipient's email
            CcAddress: 'BVFOI@governmentlegal.gov.uk'
        });
    }

    sendHODApproveEmail() {
        const emailQuickActionComponent = this.template.querySelector('c-email-quick-action');

        let replyDue = new Date(this.replyDue).toLocaleDateString('en-GB');
    
        let emailBody = `
            <p>I approve this FOI response.</p>
            <p>Regards,</p>
            <p>${this.currentUserFullName || 'FOI Team'}</p>
        `;

        // Send the email using c-email-quick-action
        emailQuickActionComponent.invoke({
            HtmlBody: emailBody,
            Subject: `RE: FOI Request - BVFOI/${this.foiNo} - Response Date: ${replyDue}`,
            ToAddress: this.ilo,  // Assuming ILO is the recipient's email
            CcAddress: 'BVFOI@governmentlegal.gov.uk'
        });
    }

    handleHiddenScreenControlsSave() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Hidden Screen Controls saved successfully',
                variant: 'success',
                mode: 'sticky'
            })
        );
    }
}