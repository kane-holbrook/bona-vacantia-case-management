import { LightningElement, track } from 'lwc';

export default class HistoryDocumentModal extends LightningElement {
    @track documentType;
    @track correspondenceWith;
    @track draft;
    @track fileData;
    @track fileName;
    @track fileSize;

    documentTypeOptions = [
        { label: 'Letter', value: 'Letter' },
        { label: 'Email', value: 'Email' },
        { label: 'Pleadings', value: 'Pleadings' },
        { label: 'FOI request', value: 'FOI_request' },
        { label: 'Office copy entries', value: 'Office_copy_entries' },
        { label: 'Changing order', value: 'Changing_order' }
    ];

    correspondenceWithOptions = [
        { label: 'Asset holder', value: 'Asset_holder' },
        { label: 'Liability holder', value: 'Liability_holder' },
        { label: 'Not applicable', value: 'Not_applicable' }
    ];

    draftOptions = [
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' },
        { label: 'Not applicable', value: 'Not_applicable' }
    ];

    handleFileChange(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            this.fileData = reader.result;
            this.fileName = file.name;
            this.fileSize = file.size;
            this.dispatchEvent(new CustomEvent('filechange', {
                detail: {
                    fileData: this.fileData,
                    fileName: this.fileName,
                    fileSize: this.fileSize,
                    documentType: this.documentType,
                    correspondenceWith: this.correspondenceWith,
                    draft: this.draft
                }
            }));
        };
        reader.readAsDataURL(file);
    }

    handleRemoveFile() {
        this.fileData = null;
        this.fileName = null;
        this.fileSize = null;
        this.dispatchEvent(new CustomEvent('fileremove'));
    }

    handlePicklistChange(event) {
        const field = event.target.name;
        if (field === 'document-type') {
            this.documentType = event.target.value;
        } else if (field === 'correspondence-with') {
            this.correspondenceWith = event.target.value;
        } else if (field === 'draft') {
            this.draft = event.target.value;
        }
    }
}