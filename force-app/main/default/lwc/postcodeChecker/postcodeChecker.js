import { LightningElement, track } from 'lwc';
import checkPostcode from '@salesforce/apex/JurisdictionPostcodeChecker.checkPostcode';

export default class PostcodeChecker extends LightningElement {
    @track postcode = '';
    @track result = '';

    // Update the postcode value
    handlePostcodeChange(event) {
        this.postcode = event.target.value.toUpperCase();
    }

    // Call the Apex method to check the postcode
    handleCheckPostcode() {
        checkPostcode({ postcode: this.postcode })
            .then(result => {
                this.result = result;
            })
            .catch(error => {
                this.result = error;
            });
    }
}