import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import libUrl from "@salesforce/resourceUrl/lib";
import myfilesUrl from '@salesforce/resourceUrl/myfiles';
import { publish, createMessageContext, releaseMessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import mimeTypes from './mimeTypes';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub';
import saveDocument from '@salesforce/apex/PDFTron_ContentVersionController.saveDocument';
import saveDocumentToSharePoint from '@salesforce/apex/PDFTron_ContentVersionController.saveDocumentToSharePoint';
import getFileDataFromIds from '@salesforce/apex/PDFTron_ContentVersionController.getFileDataFromIds';
import getUser from "@salesforce/apex/PDFTron_ContentVersionController.getUser";
import getSharePointFileDataById from '@salesforce/apex/PDFTron_ContentVersionController.getSharePointFileDataById';

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export default class PdftronWvInstanceFlow extends LightningElement {
    config = '/config_apex.js';
    error;

    @track receivedMessage = '';
    channel;
    context = createMessageContext();

    source = 'My file';
    fullAPI = true;
    enableRedaction = true;
    @api recordId;

    @api selectedDocumentId;
    @api flowData; // Custom class property

    @wire(CurrentPageReference)
    pageRef;

    @track rows = [];
    columns;
    mapping = {};

    @wire(getRecord, { recordId: '$recordId', fields: ['BV_Case__c.Name'] })
    record;

    connectedCallback() {
        this.handleSubscribe();
        window.addEventListener('message', this.handleReceiveMessage.bind(this), false);

        console.log('selectedDocumentId', this.selectedDocumentId);
        console.log('flowData', this.flowData);

        this.processFlowData(); // Process the flowData string
        this.processFile();
    }

    disconnectedCallback() {
        unregisterAllListeners(this);
        window.removeEventListener('message', this.handleReceiveMessage, true);
        this.handleUnsubscribe();
    }

    processFlowData() {
        if (this.flowData) {
            const flowDataArray = this.flowData.split(';');
            flowDataArray.forEach(item => {
                const [key, value] = item.split(':');
                if (key && value) {
                    this.mapping[key.trim()] = value.trim();
                }
            });
            console.log('Processed flowData:', this.mapping);
        }
    }

    processFile() {
        console.log('selectedDocumentId', this.selectedDocumentId);
        getSharePointFileDataById({ fileId: this.selectedDocumentId })
            .then(result => {
                console.log('data by id result', result);

                // Delay to allow the iframe to load
                setTimeout(() => {
                    this.handleBlobSelected(result);

                    registerListener('doc_gen_options', this.handleOptions, this);
                    this.columns = [
                        { "label": "Template Key", "apiName": "templateKey", "fieldType": "text", "objectName": "Account" },
                        { "label": "Value", "apiName": "Value", "fieldType": "text", "objectName": "Account" }
                    ];
                }, 3000);

                // Delay to allow mapping to be set
                setTimeout(() => {
                    this.generateDocument();
                }, 8000);
            })
            .catch(error => {
                console.log("Error fetching file data", error);
            });
    }

    generateDocument() {
        console.log('mapping', this.mapping);
        this.handleTemplateMapping(this.mapping);
    }

    handleBulkFill(results) {
        console.log(results);
        this.iframeWindow.postMessage({ type: 'BULK_TEMPLATE', results }, '*');
    }

    handleLink(event) {
        let url = event.data.payload;
        this.iframeWindow.postMessage({ type: 'LOAD_URL', url }, '*');
    }

    handleSubscribe() {
        if (this.channel) {
            return;
        }
        this.channel = subscribe(this.context, WebViewerMC, (message) => {
            if (message) {
                console.log(message);
            }
        });
    }

    handleUnsubscribe() {
        releaseMessageContext(this.context);
        unsubscribe(this.channel);
    }

    handleTemplateMapping(mapping) {
        console.log('mapping in instance: ', mapping);
        this.iframeWindow.postMessage({ type: 'FILL_TEMPLATE', mapping }, '*');
    }

    contentReplace(payload) {
        this.iframeWindow.postMessage({ type: 'REPLACE_CONTENT', payload }, '*');
    }

    contentRedact() {
        this.iframeWindow.postMessage({ type: 'REDACT_CONTENT' }, '*');
    }

    loadVideo(url) {
        this.iframeWindow.postMessage({ type: 'LOAD_VIDEO', url }, '*');
    }

    search(term) {
        this.iframeWindow.postMessage({ type: 'SEARCH_DOCUMENT', term }, '*');
    }

    handleFileIdsSelected(records) {
        console.log('handleids' + records);
        records = JSON.parse(records);
        console.log(records);
        getFileDataFromIds({ Ids: records })
            .then((result) => {
                if (result.length === 1) {
                    this.handleBlobSelected(result[0]);
                } else if (result.length > 1) {
                    console.log(result);
                    this.handleFilesSelected(result);
                }
            })
            .catch((error) => {
                console.error(error);
                this.error = error;

                //this.showNotification('Error', error.body.message, 'error');
            });

        //this.iframeWindow.postMessage({ type: 'OPEN_DOCUMENT_LIST', temprecords }, '*');
    }

    handleFilesSelected(records) {
        //records = JSON.parse(records);

        console.log("records", records);
        let temprecords = [];

        records.forEach(record => {
            let blobby = new Blob([_base64ToArrayBuffer(record.body)], {
                type: mimeTypes[record.FileExtension]
            });

            let payload = {
                blob: blobby,
                extension: record.cv.FileExtension,
                filename: record.cv.Title + "." + record.cv.FileExtension,
                documentId: record.cv.Id
            };

            temprecords = [...temprecords, payload];
        });

        console.log("temprecords", temprecords);
        this.iframeWindow.postMessage({ type: 'OPEN_DOCUMENT_LIST', temprecords }, '*');
    }

    handleBlobSelected(record) {
        const blobby = new Blob([_base64ToArrayBuffer(record.FileContent__c)], {
            type: mimeTypes[record.DocumentExtension__c]
        });

        const payload = {
            blob: blobby,
            extension: record.DocumentExtension__c,
            filename: record.Name,
            documentId: record.DocumentID__c
        };
        this.iframeWindow.postMessage({ type: "OPEN_DOCUMENT_BLOB", payload }, "*");
    }

    handleBlobSelectedBak(record) {
        console.log("record", record);
        const blobby = new Blob([_base64ToArrayBuffer(record.body)], {
            type: mimeTypes[record.FileExtension]
        });

        const payload = {
            blob: blobby,
            extension: record.cv.FileExtension,
            filename: record.cv.Title + "." + record.cv.FileExtension,
            documentId: record.cv.Id
        };
        console.log("payload", payload);
        this.iframeWindow.postMessage({ type: "OPEN_DOCUMENT_BLOB", payload }, "*");
    }

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    renderedCallback() {
        var self = this;

        if (this.uiInitialized) {
            return;
        }

        Promise.all([loadScript(self, libUrl + "/webviewer.min.js")])
            .then(() => this.handleInitWithCurrentUser())
            .catch(console.error);
    }

    handleInitWithCurrentUser() {
        getUser()
            .then((result) => {
                this.username = result;
                this.error = undefined;

                this.initUI();
            })
            .catch((error) => {
                console.error(error);
                this.showNotification("Error", error.body.message, "error");
            });
    }

    initUI() {
        var myObj = {
            libUrl: libUrl,
            myfilesUrl: myfilesUrl,
            fullAPI: this.fullAPI || false,
            namespacePrefix: '',
        };
        var url = myfilesUrl + '/WVSF-Account-info-sample.pdf';

        const viewerElement = this.template.querySelector('div')
        // eslint-disable-next-line no-unused-vars
        const viewer = new WebViewer({
            path: libUrl, // path to the PDFTron 'lib' folder on your server
            custom: JSON.stringify(myObj),
            backendType: 'ems',
            //initialDoc: url,
            config: myfilesUrl + this.config,
            fullAPI: this.fullAPI,
            enableFilePicker: this.enableFilePicker,
            enableRedaction: this.enableRedaction,
            enableMeasurement: this.enableMeasurement,
            enableOptimizedWorkers: false,
            l: 'demo:1698667176711:7ccce815030000000032579c76ef4bf6398d5025f2b556af0efef948be',
        }, viewerElement);

        viewerElement.addEventListener('ready', () => {
            this.iframeWindow = viewerElement.querySelector('iframe').contentWindow;
        })
    }

    handleReceiveMessage(event) {
        const me = this;
        if (event.isTrusted && typeof event.data === 'object') {
            switch (event.data.type) {
                case 'DOC_KEYS':
                    let keys = event.data.keys;
                    console.log("keys", keys);

                    console.log("firing doc_gen_options");

                    const mapping = this.matchKeysToProperties(keys);

                    Object.keys(mapping).forEach(key => {
                        if (typeof mapping[key] === 'string') {
                            mapping[key] = this.formatDateToUK(mapping[key]);
                        }
                    });

                    this.mapping = mapping;

                    fireEvent(this.pageRef, 'doc_gen_options', keys);
                    break;
                case 'SAVE_DOCUMENT':
                    const cvId = event.data.payload.contentDocumentId;
                    saveDocument({ json: JSON.stringify(event.data.payload), recordId: event.data.payload.recordId, cvId: cvId })
                        .then((response) => {
                            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', response }, '*');

                            fireEvent(this.pageRef, 'refreshOnSave', response);

                            this.showNotification('Success', event.data.payload.filename + ' Saved', 'success');
                        })
                        .catch(error => {
                            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', error }, '*')
                            fireEvent(this.pageRef, 'refreshOnSave', error);
                            console.error(event.data.payload.contentDocumentId);
                            console.error(JSON.stringify(error));
                            this.showNotification('Error', error.body, 'error');
                        });
                    break;
                case 'SAVE_SHAREPOINT_DOCUMENT':
                    const folderName = '/' + this.bvCaseName;

                    console.log(event.data.payload);
                    saveDocumentToSharePoint({
                        jsonpayload: JSON.stringify(event.data.payload),
                        folderName: folderName
                    })
                        .then((response) => {
                            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', response }, '*');

                            fireEvent(this.pageRef, 'refreshOnSave', response);

                            this.showNotification('Success', event.data.payload.filename + ' Saved', 'success');
                        })
                        .catch(error => {
                            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', error }, '*')
                            fireEvent(this.pageRef, 'refreshOnSave', error);
                            console.error(event.data.payload.contentDocumentId);
                            console.error(JSON.stringify(error));
                            this.showNotification('Error', error.body, 'error');
                        });
                    break;
                default:
                    break;
            }
        }
    }

    downloadDocument() {
        this.iframeWindow.postMessage({ type: "DOWNLOAD_DOCUMENT" }, "*");
    }

    @api
    closeDocument() {
        this.iframeWindow.postMessage({ type: "CLOSE_DOCUMENT" }, "*");
    }

    createUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    handleOptions(keys) {
        this.rows = []
        for (const i in keys) {
            this.rows = [...this.rows, { uuid: this.createUUID(), templateKey: keys[i], placeholder: `Replace {{${keys[i]}}}` }]
        }
    }

    matchKeysToProperties(templateKeys) {
        const dataProps = this.mapping; // Use the processed mapping from flowData
        const mapping = {};

        templateKeys.forEach(key => {
            let bestMatch = { propName: null, distance: Infinity };

            Object.keys(dataProps).forEach(propName => {
                const normalizedKey = key.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '');
                const normalizedPropName = propName.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '');
                const distance = this.getLevenshteinDistance(normalizedKey, normalizedPropName);

                if (distance < bestMatch.distance) {
                    bestMatch = { propName, distance };
                }
            });

            // Consider a reasonable threshold for accepting a match
            if (bestMatch.distance <= 3) { // Adjust as necessary based on your specific data
                mapping[key] = dataProps[bestMatch.propName];
            }
        });

        console.log('Generated mapping:', mapping);
        return mapping;
    }

    getLevenshteinDistance(s1, s2) {
        const a = s1.length;
        const b = s2.length;
        const dp = Array.from({ length: a + 1 }, () => Array(b + 1).fill(0));

        for (let i = 0; i <= a; i++) { dp[i][0] = i; }
        for (let j = 0; j <= b; j++) { dp[0][j] = j; }

        for (let i = 1; i <= a; i++) {
            for (let j = 1; j <= b; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,    // deletion
                    dp[i][j - 1] + 1,    // insertion
                    dp[i - 1][j - 1] + cost  // substitution
                );
            }
        }

        return dp[a][b];
    }

    formatDateToUK(dateStr) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Matches YYYY-MM-DD
        if (dateRegex.test(dateStr)) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                let day = date.getDate().toString().padStart(2, '0');
                let month = (date.getMonth() + 1).toString().padStart(2, '0');
                let year = date.getFullYear().toString();
                return `${day}/${month}/${year}`;
            }
        }
        return dateStr; // Return the original string if it doesn't match the date format
    }

    get bvCaseName() {
        let caseName = getFieldValue(this.record.data, 'BV_Case__c.Name');
        // Replace all occurrences of '/' with '_'

        if (caseName) {
            return caseName.replace(/\//g, '_');
        } else {
            return '';
        }
    }
}