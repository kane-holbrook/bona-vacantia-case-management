import { LightningElement } from 'lwc';

export default class DynamicActions extends LightningElement {
    actions = [
        { actionId: '1', label: 'Put away', disabled: false },
        { actionId: '2', label: 'Land registry portal', disabled: false },
        { actionId: '3', label: 'Re-allocate case', disabled: false },
        { actionId: '4', label: 'Change case category', disabled: false },
        { actionId: '5', label: 'Add accrual', disabled: false },
        { actionId: '6', label: 'Reverse accrual', disabled: false },
        { actionId: '7', label: 'BV Fais', disabled: false },
        { actionId: '8', label: 'FindAWill', disabled: false },
        { actionId: '9', label: 'LM case review', disabled: false },
        { actionId: '10', label: 'Section 27', disabled: false }
    ];

    handleActionClick(event) {
        const actionName = event.target.label;
        console.log(`Button clicked: ${actionName}`);
        // Implement specific logic based on actionName if needed
    }
}