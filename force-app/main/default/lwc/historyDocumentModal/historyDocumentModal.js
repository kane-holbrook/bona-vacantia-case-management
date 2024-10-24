import { LightningElement, track, api } from 'lwc';

export default class HistoryDocumentModal extends LightningElement {
    @api fileName;
    @api documentType;
    @api correspondenceWith;
    @api draft;
    @track fileData;
    @track fileSize;

    documentTypeOptions = [
        { label: 'Letter', value: 'Letter' },
        { label: 'Pleadings', value: 'Pleadings' },
        { label: 'FOI request', value: 'FOI request' },
        { label: 'Office copy entries', value: 'Office copy entries' },
        { label: 'Changing order', value: 'Changing order' }
    ];

    correspondenceWithOptions = [
        { label: 'Asset holder', value: 'Asset holder' },
        { label: 'Liability holder', value: 'Liability holder' },
        { label: 'Not applicable', value: 'Not applicable' }
    ];

    draftOptions = [
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' },
        { label: 'Not applicable', value: 'Not applicable' }
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
        this.dispatchEvent(new CustomEvent('fieldchange', {
            detail: {
                documentType: this.documentType,
                correspondenceWith: this.correspondenceWith,
                draft: this.draft,
                fileData: this.fileData,
                fileName: this.fileName,
                fileSize: this.fileSize
            }
        }));
    }
}