import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent, registerListener } from 'c/pubsub';
import fetchTemplates from '@salesforce/apex/FileController.fetchTemplates';
import getSharePointFileDataById from '@salesforce/apex/PDFTron_ContentVersionController.getSharePointFileDataById';

export default class GenerateDocumentModal extends LightningElement {
    @api recordId;
    @track documents;
    @track bankInfo = {
        bankName: '',
        addressLine1: '',
        addressLine2: '',
        addressLine3: '',
        postcode: '',
        telephone: '',
        fax: '',
        salutation: '',
        reference: '',
        accountNumber: '',
        sortCode: '',
        balance: null,
        spreadsheetNumber: '',
        electronicReferral: false
    };
    @track selectedDocumentId;
    @track letterType;
    @track previousLetterDate;

    @track rows = [];
    columns;
    mapping = {};

    letterTypeOptions = [
        { label: 'Acknowledgment',value: 'acknowledgment' },
        { label: 'Reminder', value: 'reminder' },
        { label: 'Holding', value: 'holding' },
    ];
    
    selectedDocumentId = null;
    isLoading = false;
    currentScreen = 'documentSelection';

    connectedCallback() {
        this.fetchDocuments();
    }

    @wire(CurrentPageReference) pageRef;

    fetchDocuments() {
        this.isLoading = true;
        fetchTemplates()
            .then(result => {
                this.documents = result;
                this.isLoading = false;
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error:', error);
            });
    }

    handleSelectionChange(event) {
        this.selectedDocumentId = event.target.dataset.id;

        registerListener('doc_gen_options', this.handleOptions, this);
        this.columns = [
            { "label" : "Template Key", "apiName" : "templateKey","fieldType":"text","objectName":"Account" },
            { "label" : "Value", "apiName" : "Value" ,"fieldType":"text","objectName":"Account"}
        ];
    }

    handleNextDocumentSelection() {
        if (this.selectedDocumentId) {
            this.currentScreen = 'bankDetails';

            getSharePointFileDataById({ fileId: this.selectedDocumentId })
            .then(result => {
                fireEvent(this.pageRef, 'blobSelected', result);

                console.log('pageRef:', this.pageRef);
                this.isLoading = false;
            })
            .catch(error => {
                this.error = error;
                console.error(error);
                this.isLoading = false;
            });
        } else {
            alert('Please select a document.');
        }
    }

    handleBankDetailsNext() {
        this.currentScreen = 'selectLetterType';
    }

    handleLetterTypeNext() {
        this.currentScreen = 'enterDateOfPreviousLetter';
    }

    handleBack() {
        this.dispatchEvent(new CustomEvent('back'));
    }

    handleBankNameChange(event) {
        this.bankInfo.bankName = event.detail.value;
    }

    handleAddressLine1Change(event) {
        this.bankInfo.addressLine1 = event.detail.value;
    }

    handleAddressLine2Change(event) {
        this.bankInfo.addressLine2 = event.detail.value;
    }

    handleAddressLine3Change(event) {
        this.bankInfo.addressLine3 = event.detail.value;
    }

    handlePostcodeChange(event) {
        this.bankInfo.postcode = event.detail.value;
    }

    handleTelephoneChange(event) {
        this.bankInfo.telephone = event.detail.value;
    }

    handleFaxChange(event) {
        this.bankInfo.fax = event.detail.value;
    }

    handleSalutationChange(event) {
        this.bankInfo.salutation = event.detail.value;
    }

    handleReferenceChange(event) {
        this.bankInfo.reference = event.detail.value;
    }

    handleAccountNumberChange(event) {
        this.bankInfo.accountNumber = event.detail.value;
    }

    handleSortCodeChange(event) {
        this.bankInfo.sortCode = event.detail.value;
    }

    handleBalanceChange(event) {
        this.bankInfo.balance = event.detail.value;
    }

    handleSpreadsheetNumberChange(event) {
        this.bankInfo.spreadsheetNumber = event.detail.value;
    }

    handleElectronicReferralChange(event) {
        this.bankInfo.electronicReferral = event.detail.checked;
    }

    handleLetterTypeChange(event) {
        this.letterType = event.detail.value;
    }

    handlePreviousLetterDateChange(event) {
        this.previousLetterDate = event.detail.value;
    }

    handleGenerateDocument() {
        this.currentScreen = 'generatedDocument';

        this.mapping = {
            "letter_type": this.letterType,
        };

        fireEvent(this.pageRef, 'doc_gen_mapping', this.mapping);
    }

    createUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    handleOptions(keys) {
        this.rows = []
        for(const i in keys) {
            this.rows = [...this.rows, {uuid: this.createUUID(), templateKey: keys[i], placeholder: `Replace {{${keys[i]}}}`}]
        }
    }

    get isDocumentSelection() {
        return this.currentScreen === 'documentSelection';
    }

    get isBankDetails() {
        return this.currentScreen === 'bankDetails';
    }

    get isLetterTypeSelection() {
        return this.currentScreen === 'selectLetterType';
    }

    get isEnterDateOfPreviousLetter() {
        return this.currentScreen === 'enterDateOfPreviousLetter';
    }

    get isGeneratedDocument() {
        return this.currentScreen === 'generatedDocument';
    }
}