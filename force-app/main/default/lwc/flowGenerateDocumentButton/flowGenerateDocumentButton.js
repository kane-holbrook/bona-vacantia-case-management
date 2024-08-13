import { LightningElement } from 'lwc';

export default class FlowGenerateDocumentButton extends LightningElement {
    handleSaveDocument() {
        // Create and dispatch the custom event
        const event = new CustomEvent('savedocument', {
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }
}