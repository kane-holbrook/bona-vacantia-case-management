import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import libUrl from "@salesforce/resourceUrl/lib";
import myfilesUrl from '@salesforce/resourceUrl/myfiles';
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
    @api contentDocumentId;

    @wire(CurrentPageReference)
    pageRef;

    connectedCallback() {
        this.loadFileAndConvert();
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
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // MIME type for .docx
        });

        const payload = {
            blob: blobby,
            extension: 'docx',
            filename: record.Name,
            documentId: record.DocumentID__c
        };
        this.iframeWindow.postMessage({ type: "CONVERT_TO_PDF", payload }, "*");
    }

    renderedCallback() {
        if (this.uiInitialized) {
            return;
        }
        this.uiInitialized = true;

        loadScript(this, libUrl + "/webviewer.min.js")
            .then(() => this.initUI())
            .catch(console.error);
    }

    initUI() {
        const viewerElement = this.template.querySelector('div');
        const viewer = new WebViewer({
            path: libUrl,
            initialDoc: myfilesUrl + '/WVSF-Account-info-sample.pdf', // Just a placeholder; you can replace it with any URL
            config: myfilesUrl + '/config_apex.js',
        }, viewerElement);

        viewerElement.addEventListener('ready', () => {
            this.iframeWindow = viewerElement.querySelector('iframe').contentWindow;
        });
    }
}