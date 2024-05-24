import { LightningElement, api, track } from 'lwc';
import createAccrual from '@salesforce/apex/SOSFinanceController.createAccrual';

export default class SosCreateAccrual extends LightningElement {
    @api caseNumber;
    @track accrualType;
    @track assetType;
    @track selectAssetType;
    @track landType;
    @track address;
    @track transactionCode;
    @track accountCode;
    @track narrative;
    @track accountOrReference;
    @track amount;
    @track propertyDetails = {
        addressLine1: '',
        addressLine2: '',
        addressLine3: '',
        postcode: '',
        owned: '',
        tenanted: 'Unknown',
        tenure: 'Unknown',
        titleNumber: ''
    };
    currentScreen = 'accrualType'; // This controls the screen flow

    accrualTypeOptions = [
        { label: 'Receipt', value: 'receipt' },
        { label: 'Payment', value: 'payment' },
    ];

    assetTypeOptions = [
        { label: 'Land', value: 'land' },
        { label: 'Property', value: 'property' },
        { label: 'Cash asset', value: 'cashAsset' },
        { label: 'Stocks/Insurance', value: 'stocksInsurance' },
        { label: 'Vehicle', value: 'vehicle' },
        { label: 'Personal effects', value: 'personalEffects' },
    ];

    selectAssetTypeOptions = [
        { label: 'Bank/Building Society account', value: 'bank' },
        { label: 'Cash', value: 'cash' },
        { label: 'Pension', value: 'pension' },
        { label: 'National Savings and Investments', value: 'savings' },
        { label: 'Refunds from utilities etc', value: 'refunds' },
        { label: 'Money arising from trusts', value: 'trusts' },
        { label: 'Court Funds', value: 'court' },
    ];

    landTypeOptions = [
        { label: 'Freehold', value: 'freehold' },
        { label: 'Leasehold', value: 'leasehold' },
    ];

    ownershipOptions = [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
    ];

    propertyTypeOptions = [
        { label: 'Freehold', value: 'freehold' },
        { label: 'Leasehold', value: 'leasehold' },
        { label: 'Mobile home', value: 'mobileHome' },
    ];

    // Screen display conditions based on the currentScreen value
    get isAccrualTypeSelection() {
        return this.currentScreen === 'accrualType';
    }

    get isAssetTypeSelection() {
        return this.currentScreen === 'assetType';
    }

    get isSelectAssetTypeSelection() {
        return this.currentScreen === 'selectAssetType';
    }

    get isLandTypeSelection() {
        return this.currentScreen === 'landType';
    }

    get isAddressInput() {
        return this.currentScreen === 'addressInput';
    }

    get isAmountInput() {
        return this.currentScreen === 'amountInput';
    }

    get isPropertyDetailsInput() {
        return this.currentScreen === 'propertyDetails';
    }

    get isPropertyTypeSelection() {
        return this.currentScreen === 'propertyType';
    }

    get isBankDetailsInput() {
        return this.currentScreen === 'bankDetails';
    }

    // Button disabled states
    get disableAccrualTypeNext() {
        return !this.accrualType;
    }

    get disableAssetTypeNext() {
        return !this.assetType;
    }

    get disableSelectAssetTypeNext() {
        return !this.selectAssetType;
    }

    get disableLandTypeNext() {
        return !this.landType;
    }

    // Event handlers for the Next buttons
    handleAccrualTypeNext() {
        if (this.accrualType === 'receipt') {
            this.transactionCode = 'ARE2';
            this.currentScreen = 'assetType';
        }
    }


    handleAssetTypeNext() {
        if (this.assetType === 'land') {
            this.accountCode = 'EA2';
            this.currentScreen = 'landType';
        } else if (this.assetType === 'property') {
            this.currentScreen = 'propertyDetails';
            this.accountCode = 'EA2';
        } else if (this.assetType === 'cashAsset') {
            this.accountCode = 'E3';
            this.currentScreen = 'selectAssetType';
        } else {
            // Navigate to other types if necessary
            this.currentScreen = 'amountInput';
        }
    }

    handleSelectAssetTypeNext() {
        if (this.selectAssetType === 'bank') {
            this.currentScreen = 'bankDetails';
        } else if (this.selectAssetType === 'cash') {
            this.currentScreen = 'cashDetails';
        } else if (this.selectAssetType === 'pension') {
            this.currentScreen = 'pensionDetails';
        }
    }

    handleLandTypeNext() {
        if (this.landType) {
            this.narrative = `${this.accountCode} ${this.landType} land`;
            this.currentScreen = 'addressInput';
        }
    }

    handleAddressNext() {
        if (this.address) {
            this.currentScreen = 'amountInput';
        }
    }

    handleAmountSubmit() {
        let reference = this.assetType === 'property' ? this.concatenatedAddress : this.address;
        
        createAccrual({
            MtCode: this.caseNumber,
            Net: this.amount,
            Narrative: this.narrative,
            Reference: reference,
            Type: 'CR'
        })
        .then(result => {
            console.log('Success:', result);
            window.location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Update change handlers to only update values
    handleAccrualTypeChange(event) {
        this.accrualType = event.detail.value;
    }

    handleAssetTypeChange(event) {
        this.assetType = event.detail.value;
    }

    handleSelectAssetTypeChange(event) {
        this.selectAssetType = event.detail.value;
    }

    handleLandTypeChange(event) {
        this.landType = event.detail.value;
    }

    handleAddressChange(event) {
        this.address = event.detail.value;
        this.accountOrReference = this.address;
    }

    handleAmountChange(event) {
        this.amount = event.detail.value;
    }

    handlePropertyDetailsNext() {
        this.currentScreen = 'propertyType';
    }

    handlePropertyTypeNext() {
        this.currentScreen = 'amountInput';
    }

    handleAddressLine1Change(event) {
        this.propertyDetails.addressLine1 = event.detail.value;
    }

    handleAddressLine2Change(event) {
        this.propertyDetails.addressLine2 = event.detail.value;
    }

    handleAddressLine3Change(event) {
        this.propertyDetails.addressLine3 = event.detail.value;
    }

    handlePostcodeChange(event) {
        this.propertyDetails.postcode = event.detail.value;
    }

    handleOwnedChange(event) {
        this.propertyDetails.owned = event.detail.value;
    }

    handleTitleNumberChange(event) {
        this.propertyDetails.titleNumber = event.detail.value;
    }

    handlePropertyTypeChange(event) {
        this.propertyDetails.tenure = event.detail.value;

        this.narrative = `${this.accountCode} ${this.propertyDetails.tenure} property`;
    }

    get concatenatedAddress() {
        return `${this.propertyDetails.addressLine1}, ${this.propertyDetails.addressLine2}, ${this.propertyDetails.addressLine3}, ${this.propertyDetails.postcode}`;
    }
}