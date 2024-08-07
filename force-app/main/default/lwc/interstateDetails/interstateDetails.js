import { LightningElement } from 'lwc';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';

export default class DynamicActions extends LightningElement {
    actions = [
        { actionId: '1', label: 'Put away', disabled: false },
        { actionId: '2', label: 'Re-allocate case', disabled: false },
        { actionId: '3', label: 'Change case category', disabled: false },
        { actionId: '4', label: 'Add accrual', disabled: false },
        { actionId: '5', label: 'Reverse accrual', disabled: false },
        { actionId: '6', label: 'LM case review', disabled: false },
        { actionId: '7', label: 'Section 27', disabled: false }
    ];

    handleActionClick(event) {
        const actionName = event.target.label;
        console.log(`Button clicked: ${actionName}`);
        if (actionName === 'Put away') {
            const flow = this.template.querySelector('lightning-flow');
            if (flow) {
                flow.startFlow('Put_Away_a_Case');
            }
        }
        // Implement specific logic based on actionName if needed
    }
}