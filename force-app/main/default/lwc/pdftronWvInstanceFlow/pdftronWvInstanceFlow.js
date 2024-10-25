import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import libUrl from "@salesforce/resourceUrl/lib";
import myfilesUrl from '@salesforce/resourceUrl/myfiles';
import { publish, createMessageContext, releaseMessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c";
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import mimeTypes from './mimeTypes';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub';
import saveDocument from '@salesforce/apex/PDFTron_ContentVersionController.saveDocument';
import saveDocumentToSharePoint from '@salesforce/apex/PDFTron_ContentVersionController.saveDocumentToSharePointViaFlow';
import getFileDataFromIds from '@salesforce/apex/PDFTron_ContentVersionController.getFileDataFromIds';
import getUser from "@salesforce/apex/PDFTron_ContentVersionController.getUser";
import updateCaseHistoryTask from '@salesforce/apex/HistoryController.updateCaseHistoryTask';
import deleteHistoryRecord from '@salesforce/apex/HistoryController.deleteHistoryRecord';
import getSharePointFileDataById from '@salesforce/apex/FileControllerGraph.getGraphFileDataById';
import { getRecordId } from 'c/sharedService';
import fetchHeaderValuesFromMetadata from '@salesforce/apex/PDFTron_ContentVersionController.fetchHeaderValuesFromMetadata';

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
    enableRedaction = false;
    @track documentLoadedCallback;
    @api recordId;

    @api selectedDocumentId;
    @api flowData; // Custom class property
    @api historyRecordId;
    @api taskId;
    @api serverRelativeUrl;

    @wire(CurrentPageReference)
    pageRef;

    @track rows = [];
    columns;
    mapping = {};

    @track doc_keys;

    @wire(getRecord, { recordId: '$recordId', fields: ['BV_Case__c.Name'] })
    record;

    connectedCallback() {
        if (this.recordId === undefined) {
            this.recordId = getRecordId();
        }

        this.handleSubscribe();
        window.addEventListener('message', this.handleReceiveMessage.bind(this), false);

        console.log('selectedDocumentId', this.selectedDocumentId);
        console.log('flowData', this.flowData);

        this.processFlowData(); // Process the flowData string

        // Start the document generation process in the connectedCallback
        this.executeDocumentGenerationSequence();

        this.template.addEventListener('savedocument', this.handleSaveDocumentEvent.bind(this));
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
                    let trimmedValue = value.trim().toLowerCase();
    
                    // Convert to boolean if applicable
                    if (trimmedValue === 'true') {
                        this.mapping[key.trim()] = true;
                    } else if (trimmedValue === 'false') {
                        this.mapping[key.trim()] = false;
                    } else {
                        // Otherwise, treat as string
                        this.mapping[key.trim()] = value.trim();
                    }
                }
            });
        }
    
        // Add default values for specific placeholders
        this.mapping.currentDate = this.getCurrentDateFormatted();
    
        console.log('Processed flowData:', this.mapping);
    }

    getCurrentDateFormatted() {
        const date = new Date();
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const daySuffix = this.getDaySuffix(day);

        return `${day}${daySuffix} ${month} ${year}`;
    }

    getDaySuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    // New method to handle document generation flow
    async executeDocumentGenerationSequence() {
        try {
            await this.processFile(); // Wait for file data to be processed and iframe to be ready
            await this.waitForDocumentLoaded(); // Wait for documentLoaded event before continuing
            //await this.insertHeaderPDF(); // Insert header PDF
            await this.fireDocGenOptionsEvent(); // Wait for doc_gen_options event to be handled
            await this.processHeaderKeys(); // Process header keys after doc_gen_options event
            await this.generateDocumentPromise(); // Wait for document generation to complete
            console.log('Document generation sequence completed.');
        } catch (error) {
            console.error('Error in document generation sequence:', error);
            this.showNotification('Error', 'An error occurred during document generation', 'error');
        }
    }

    waitForDocumentLoaded() {
        return new Promise((resolve) => {
            this.documentLoadedCallback = resolve; // Store the resolve function
        });
    }

    fireDocGenOptionsEvent() {
        return new Promise((resolve) => {
            console.log("Firing doc_gen_options event");
            fireEvent(this.pageRef, 'doc_gen_options', this.doc_keys);
            // Using a small delay to simulate waiting for the event to be handled
            setTimeout(() => resolve(), 100); 
        });
    }

    generateDocumentPromise() {
        return new Promise((resolve) => {
            console.log("Generating document with mapping: ", this.mapping);
            this.generateDocument();
            setTimeout(() => resolve(), 100); // Resolving after FILL_TEMPLATE is posted
        });
    }

    processFile() {
        console.log('selectedDocumentId', this.selectedDocumentId);
        return new Promise((resolve, reject) => {
            getSharePointFileDataById({ fileId: this.selectedDocumentId })
                .then(result => {
                    console.log('data by id result', result);
                    this.waitForIframeLoad().then(() => {
                        this.handleBlobSelected(result);
                        registerListener('doc_gen_options', this.handleOptions, this);
                        this.columns = [
                            { "label": "Template Key", "apiName": "templateKey", "fieldType": "text", "objectName": "Account" },
                            { "label": "Value", "apiName": "Value", "fieldType": "text", "objectName": "Account" }
                        ];
                        resolve();
                    });
                })
                .catch(error => {
                    console.log("Error fetching file data", error);
                    reject(error);
                });
        });
    }

    waitForIframeLoad() {
        return new Promise((resolve) => {
            const checkIframe = () => {
                if (this.iframeWindow) {
                    resolve();
                } else {
                    requestAnimationFrame(checkIframe);
                }
            };
            checkIframe();
        });
    }

    generateDocument() {
        console.log('Filling template with mapping', this.mapping);
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
        console.log('Mapping in instance: ', mapping);
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
            });
    }

    handleFilesSelected(records) {
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
        this.iframeWindow.postMessage({ type: "OPEN_DOCUMENT_BLOB", payload }, "*");
    }

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'sticky'
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
            path: libUrl, 
            custom: JSON.stringify(myObj),
            backendType: 'ems',
            config: myfilesUrl + this.config,
            fullAPI: this.fullAPI,
            enableOptimizedWorkers: true,
            l: 'demo:1698667176711:7ccce815030000000032579c76ef4bf6398d5025f2b556af0efef948be',
            accessibleMode: true,
            disabledElements: [
                'toolbarGroup-Annotate', 
                'toolbarGroup-Shapes', 
                'toolbarGroup-Insert', 
                'toolbarGroup-Edit', 
                'toolbarGroup-FillAndSign', 
                'toolbarGroup-Forms', 
                'toolbarGroup-Save', 
                'selectToolButton', 
                'viewControlsButton', 
                'menuButton', 
                'panToolButton', 
                'toggleNotesButton', 
                'eraserToolButton',
            ],
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

                    this.doc_keys = keys;

                    console.log("firing doc_gen_options");

                    const mapping = this.matchKeysToProperties(keys);

                    Object.keys(mapping).forEach(key => {
                        if (typeof mapping[key] === 'string') {
                            mapping[key] = this.formatDateToUK(mapping[key]);
                        }
                    });

                    this.mapping = mapping;
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
                    const folderName = this.bvCaseName + '/' + this.historyRecordId;
                
                    console.log(event.data.payload);
                    saveDocumentToSharePoint({
                        jsonpayload: JSON.stringify(event.data.payload),
                        folderName: folderName,
                        historyRecordId: this.historyRecordId
                    })
                        .then((response) => {
                            this.serverRelativeUrl = response.webUrl;

                            console.log('response', this.serverRelativeUrl);
                            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', response }, '*');
                            fireEvent(this.pageRef, 'refreshOnSave', response);
                    
                            // Check if taskId is present
                            if (this.taskId) {
                                // Update Case History record with the taskId
                                updateCaseHistoryTask({
                                    historyRecordId: this.historyRecordId,
                                    taskId: this.taskId
                                })
                                .then(() => {
                                    this.showNotification('Success', 'History record updated with Task ID', 'success');
                                })
                                .catch(error => {
                                    console.error('Error updating history record:', error);
                                    this.showNotification('Error', 'Failed to update history record with Task ID', 'error');
                                });
                            }
                    
                            this.showNotification('Document Generated', event.data.payload.filename + ' has been generated and attached to history', 'success');

                            // Navigate to next LWC screen
                            const navigateNextEvent = new FlowNavigationNextEvent();
                            this.dispatchEvent(navigateNextEvent);
                        })
                        .catch(error => {
                            me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', error }, '*');
                            fireEvent(this.pageRef, 'refreshOnSave', error);
                            console.error(event.data.payload.contentDocumentId);
                            console.error(JSON.stringify(error));
                            this.showNotification('Error', error.body, 'error');
                        });
                    break;
                    case 'DOCUMENT_LOADED':
                        console.log("Document fully loaded, ready for further operations.");
                        if (this.documentLoadedCallback) {
                            this.documentLoadedCallback(); // Resolve the promise waiting for document load
                            this.documentLoadedCallback = null; // Clear the callback once resolved
                        }
                        break;
                case 'PDF_MERGED':
                    console.log('Header PDF has been merged successfully');
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

    handleSaveDocumentEvent() {
        this.iframeWindow.postMessage({ type: 'SAVE_DOCUMENT' }, '*');
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
        const dataProps = this.mapping; //  // Use the processed mapping from flowData
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
            if (bestMatch.distance <= 3) { 
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
                    dp[i - 1][j] + 1, // Deletion
                    dp[i][j - 1] + 1, // Insertion
                    dp[i - 1][j - 1] + cost // Substitution
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

    handleCancelAndRestartFlow() {
        // Delete the history record before canceling and restarting the flow
        deleteHistoryRecord({ historyRecordId: this.historyRecordId })
            .then(() => {
                // Dispatch the finish event to end the flow
                window.location.reload();
            })
            .catch(error => {
                console.error('Error deleting history record:', error);
                this.showNotification('Error', 'Failed to delete history record', 'error');
            });
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

    // Add this new method after processFile()
    async insertHeaderPDF() {
        return new Promise((resolve, reject) => {
            console.log('Starting header PDF insertion process');
            
            // Load the header PDF from static resources
            const headerPdfUrl = '/resource/headerPDF';
            
            fetch(headerPdfUrl)
                .then(response => response.blob())
                .then(headerBlob => {
                    console.log('Header PDF data retrieved');
                    return headerBlob;
                })
                .then(headerBuffer => {
                    console.log('Header buffer created, sending to WebViewer');
                    this.iframeWindow.postMessage({ 
                        type: 'MERGE_PDF', 
                        payload: {
                            headerPdf: headerBuffer,
                        }
                    }, '*');
                    
                    // Listen for the merge completion
                    const mergeListener = (event) => {
                        if (event.data && event.data.type === 'PDF_MERGED') {
                            window.removeEventListener('message', mergeListener);
                            if (event.data.success) {
                                console.log('Header PDF merge completed successfully');
                                resolve();
                            } else {
                                console.error('Header PDF merge failed:', event.data.error);
                                reject(new Error(event.data.error));
                            }
                        }
                    };
                    
                    window.addEventListener('message', mergeListener);
                    
                    // Add timeout to prevent hanging
                    // setTimeout(() => {
                    //     window.removeEventListener('message', mergeListener);
                    //     reject(new Error('Header PDF merge timed out'));
                    // }, 10000); // 10 second timeout
                })
                .catch(error => {
                    console.error('Error in header PDF process:', error);
                    reject(error);
                });
        });
    }

    // New method to fetch header values from metadata
    fetchHeaderValues(headerLabel, customFields) {
        return new Promise((resolve, reject) => {
            // Call Apex method to fetch metadata values
            fetchHeaderValuesFromMetadata({ headerLabel, customFields })
                .then(result => {
                    resolve(result);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    async processHeaderKeys() {
        const headerKeys = this.doc_keys.filter(key => key.startsWith('HEADER'));
        const headerGroups = {};

        headerKeys.forEach(key => {
            const parts = key.split('_');
            if (parts.length > 1) {
                const headerLabel = parts[1];
                const customField = parts.slice(2).join('_');

                if (!headerGroups[headerLabel]) {
                    headerGroups[headerLabel] = [];
                }
                headerGroups[headerLabel].push(customField);
            }
        });

        // Create an array of promises for fetching header values
        const fetchPromises = Object.keys(headerGroups).map(headerLabel => {
            return this.fetchHeaderValues(headerLabel, headerGroups[headerLabel])
                .then(values => {
                    Object.keys(values).forEach(field => {
                        // Remove __c from the field name if it exists
                        const cleanField = field.replace('__c', '');
                        const key = `HEADER_${headerLabel}_${cleanField}`;
                        
                        if (cleanField.toLowerCase().endsWith('logo')) {
                            this.mapping[key] = {
                                image_url: values[field],
                                width: 205,
                                height: 95
                            };
                        } else {
                            this.mapping[key] = values[field];
                        }
                    });
                    console.log('Mapping after processing header keys:', this.mapping);
                })
                .catch(error => {
                    console.error('Error fetching header values:', error);
                });
        });

        // Wait for all fetch operations to complete
        await Promise.all(fetchPromises);
    }
}
