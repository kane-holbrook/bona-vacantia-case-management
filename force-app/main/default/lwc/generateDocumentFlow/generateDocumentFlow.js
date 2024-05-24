import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import fetchTemplates from '@salesforce/apex/FileController.fetchTemplates';

export default class GenerateDocumentFlow extends LightningElement {
    @api recordId;
    @api caseId;
    @track documents;
    @api selectedDocumentId;
    @api selectedDocumentType;
    @api availableActions = [];
    
    isLoading = false;

    connectedCallback() {
        this.fetchDocuments();
    }

    @wire(CurrentPageReference) pageRef;

    fetchDocuments() {
        this.isLoading = true;
        const sharePointDomain = 'https://glduat.sharepoint.com';
        const siteName = 'sites/XansiumUATTestSite';
        const parentFolderPath = encodeURIComponent(`123`); // Required for some reason
        fetchTemplates()
            .then(result => {
                this.documents = result.map(doc => {
                    // Construct the SharePoint preview URL
                    let previewUrl = `${sharePointDomain}/${siteName}/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(doc.ServerRelativeURL__c)}&parent=${parentFolderPath}`;
                    // Return the document with the added previewUrl property
                    return {...doc, previewUrl};
                });
                this.isLoading = false;
            })
            .catch(error => {
                this.isLoading = false;
                console.error('Error:', error);
            });
    }

    handleSelectionChange(event) {
        this.selectedDocumentId = event.target.dataset.id;
        const selectedDocument = this.documents.find(doc => doc.DocumentID__c === this.selectedDocumentId);
        if (selectedDocument) {
            this.selectedDocumentType = selectedDocument.DocumentType__c;
        }
    }

    handleNextDocumentSelection() {
        if (this.selectedDocumentId) {
            // If the next action is available, navigate to the next screen
            if (this.availableActions.includes('NEXT')) {
                const navigateNextEvent = new FlowNavigationNextEvent();
                this.dispatchEvent(navigateNextEvent);
            }
        } else {
            alert('Please select a document.');
        }
    }
}