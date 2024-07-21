import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';

export default class EmailQuickAction extends NavigationMixin(LightningElement) {
    @api recordId;
    
    @api invoke(defaultValues) {
        var pageRef = {
            type: "standard__quickAction",
            attributes: {
                apiName: "Global.SendEmail"
            },
            state: {
                recordId: this.recordId,
                defaultFieldValues: encodeDefaultFieldValues(defaultValues)
            }
        };
        this[NavigationMixin.Navigate](pageRef);
    }
}