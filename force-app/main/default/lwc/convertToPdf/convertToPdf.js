import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import WebViewerMC from "@salesforce/messageChannel/WebViewerMessageChannel__c";
import libUrl from "@salesforce/resourceUrl/lib";
import myfilesUrl from '@salesforce/resourceUrl/myfiles';
import mimeTypes from './mimeTypes';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub';
import { publish, createMessageContext, releaseMessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import getUser from "@salesforce/apex/PDFTron_ContentVersionController.getUser";
import getSharePointFileDataById from '@salesforce/apex/FileControllerGraph.getGraphFileDataById';

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export default class pdftronWvInstanceDocxToPDF extends LightningElement {
    config = '/config_apex.js';
    fullAPI = true;
    @track receivedMessage = '';
    channel;
    context = createMessageContext();
    @api contentDocumentId;

    @wire(CurrentPageReference)
    pageRef;

    connectedCallback() {
        this.handleSubscribe();

        this.loadFileAndConvert();
    }

    disconnectedCallback() {
        unregisterAllListeners(this);
        this.handleUnsubscribe();
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

    loadFileAndConvert() {
        getSharePointFileDataById({ fileId: this.contentDocumentId })
            .then(result => {
                this.waitForIframeLoad().then(() => {
                    this.handleBlobSelected(result);
                });
            })
            .catch(error => {
                console.error("Error fetching file data", error);
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

        console.log("payload", payload);
        this.iframeWindow.postMessage({ type: "CONVERT_TO_PDF", payload }, "*");
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

        const viewerElement = this.template.querySelector('div');
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
            disabledElements: [
                'toolbarGroup-Annotate', // Disable the Annotate toolbar group
                'toolbarGroup-Shapes', // Disable the Shapes toolbar group
                'toolbarGroup-Insert', // Disable the Insert toolbar group
                'toolbarGroup-Edit', // Disable the Edit toolbar group
                'toolbarGroup-FillAndSign', // Disable the Fill and Sign toolbar group
                'toolbarGroup-Forms', // Disable the Forms toolbar group
                'toolbarGroup-Save', // Disable the Save toolbar group (tool.saveDocument)
                'selectToolButton', // Disable the Select tool button
                'viewControlsButton', // Disable the View Controls button
                'menuButton', // Disable the Menu button
                'panToolButton', // Disable the Pan tool button
                'toggleNotesButton', // Disable the Panel toggle button
                'eraserToolButton', // Disable the Eraser tool button
            ],
        }, viewerElement);

        viewerElement.addEventListener('ready', () => {
            this.iframeWindow = viewerElement.querySelector('iframe').contentWindow;
        })
    }

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'pester'
        });
        this.dispatchEvent(evt);
    }
}