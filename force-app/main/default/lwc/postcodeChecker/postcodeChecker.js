import { LightningElement, track } from 'lwc';
import checkPostcode from '@salesforce/apex/JurisdictionPostcodeChecker.checkPostcode';

export default class PostcodeChecker extends LightningElement {
    @track postcode = '';
    @track result = '';

    // Update the postcode value
    handlePostcodeChange(event) {
        this.postcode = this.formatPostcode(event.target.value.toUpperCase().trim());
    }

    // Function so that if postcode is e.g "SW1A2AA", format it to "SW1A 2AA"
    formatPostcode(postcode) {
        const postcodeRegex = /^(([A-Z]{1,2}[0-9][A-Z0-9]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA) ?[0-9][A-Z]{2}|BFPO ?[0-9]{1,4}|(KY[0-9]|MSR|VG|AI)[ -]?[0-9]{4}|[A-Z]{2} ?[0-9]{2}|GE ?CX|GIR ?0A{2}|SAN ?TA1)$/i;
        const illegalChars = /[^A-Z0-9\s]/;

        if (illegalChars.test(postcode)) {
            return postcode;
        }

        if (postcodeRegex.test(postcode.replace(/\s/g, ''))) {
            const formattedPostcode = postcode.replace(/([A-Z0-9]+)([A-Z0-9]{3})$/, '$1 $2');
            return formattedPostcode;
        }

        return postcode;
    }


    // Check if the postcode is valid
    isValidPostcode() {
        const postcodeRegex = /^(([A-Z]{1,2}[0-9][A-Z0-9]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA) ?[0-9][A-Z]{2}|BFPO ?[0-9]{1,4}|(KY[0-9]|MSR|VG|AI)[ -]?[0-9]{4}|[A-Z]{2} ?[0-9]{2}|GE ?CX|GIR ?0A{2}|SAN ?TA1)$/i;
        const illegalChars = /[^A-Z0-9\s]/

        if(!this.postcode){
            return "Please enter a postcode, e.g. SW1A 2AA";
        }else if(illegalChars.test(this.postcode)){
            return `The postcode ${this.postcode} has invalid characters. A valid postcode contains only letters, digits, and a space.`;
        }else if(!postcodeRegex.test(this.postcode)){
            return `${this.postcode} is an invalid postcode format. A valid postcode format is e.g. SW1A 2AA.`;

        }
    }

    // Call the Apex method to check the postcode
    handleCheckPostcode() {
        const validationError = this.isValidPostcode(this.postcode);
        if (validationError) {
            this.result = validationError;
            return result;
        }

        checkPostcode({ postcode: this.postcode })
            .then(result => {
                this.result = result;
            })
            .catch(error => {
                this.result = error;
            });
    }

    // If user presses enter, check the postcode
    handleKeyPress(event){
        if(event.keyCode === 13){
            this.postcode = this.formatPostcode(event.target.value.toUpperCase().trim());
            this.handleCheckPostcode();
        }
    }
}