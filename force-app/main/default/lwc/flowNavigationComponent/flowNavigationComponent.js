import { LightningElement, api } from 'lwc';
import { FlowNavigationNextEvent, FlowNavigationBackEvent } from 'lightning/flowSupport';

export default class FlowNavigationComponent extends LightningElement {
    @api availableActions = [];
    @api caseType;

    handleNext() {
        if (this.availableActions.includes('NEXT')) {
            const caseTypeEvent = new CustomEvent('casetypeevent', {
                detail: { caseType: this.caseType },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(caseTypeEvent);

            const nextEvent = new CustomEvent('next', {
                bubbles: true,
                composed: true
            });

            this.dispatchEvent(nextEvent);

            const navigateNextEvent = new FlowNavigationNextEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }

    handleBack() {
        if (this.availableActions.includes('BACK')) {
            const backEvent = new CustomEvent('back', {
                bubbles: true,
                composed: true
            });

            this.dispatchEvent(backEvent);

            const navigateBackEvent = new FlowNavigationBackEvent();
            this.dispatchEvent(navigateBackEvent);
        }
    }
}