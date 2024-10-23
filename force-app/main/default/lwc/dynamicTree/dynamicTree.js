import { LightningElement, api, track } from 'lwc';
import getTreeData from '@salesforce/apex/LayoutController.getTreeData';
import getRecordTypeId from '@salesforce/apex/LayoutController.getRecordTypeId';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';

export default class DynamicTree extends LightningElement {
    @api recordId;
    @track treeItems = [];
    @track error;
    @track searchTerm = '';
    @track isSearchActive = false;
    @track recordTypeDeveloperName;
    @track treeName;

    connectedCallback() {
        this.retrieveRecordTypeDeveloperName();
    }
    
    async retrieveRecordTypeDeveloperName() {
        try {
            const recordTypeId = await getRecordTypeIdForRecord({ recordId: this.recordId });
            const recordTypeDeveloperName = await getRecordTypeDeveloperName({ recordTypeId: recordTypeId });
            this.recordTypeDeveloperName = recordTypeDeveloperName;

            console.log('RecordtypeDevname', this.recordTypeDeveloperName);
            this.loadTreeData();
        } catch (error) {
            this.error = error;
            this.treeItems = [];
        }
    }

    async loadTreeData() {
        try {
            const data = await getTreeData({ recordTypeDeveloperName: this.recordTypeDeveloperName });
            this.treeItems = this.formatTreeDataForLightningTree(data);
            this.error = undefined;
            this.setTreeName(this.recordTypeDeveloperName);
        } catch (error) {
            this.error = error;
            this.treeItems = [];
        }
    }

    formatTreeDataForLightningTree(data) {
        const formatNodes = (nodes, parentLabel = null, grandChildLabel = null, greatGrandChildLabel = null) => {
            return nodes.map(node => ({
                label: node.label,
                name: node.label, // Use a unique identifier if available
                object: node.object, // Ensure object is included
                expanded: false,
                parentLabel: parentLabel,
                grandChildLabel: grandChildLabel,
                greatGrandChildLabel: greatGrandChildLabel,
                items: node.children ? formatNodes(node.children, node.label, parentLabel, grandChildLabel) : []
            }));
        };
        return formatNodes(data);
    }

    handleTreeSelect(event) {
        const selectedName = event.detail.name;
        const findNode = (nodes) => {
            for (const node of nodes) {
                if (node.name === selectedName) {
                    return node;
                }
                if (node.items) {
                    const found = findNode(node.items);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        };

        const selectedNode = findNode(this.treeItems);
        if (selectedNode && selectedNode.object) {
            this.dispatchNavigationEvent(selectedNode);
        }
    }

    async dispatchNavigationEvent(node) {
        const updatedLabel = this.getUpdatedLabel(node.label);
        const recordTypeId = await getRecordTypeId({ objectName: node.object, recordTypeName: updatedLabel });
        const navigationEvent = new CustomEvent('navigate', {
            detail: { 
                recordTypeId, 
                object: node.object, 
                label: updatedLabel, 
                parentLabel: node.parentLabel, 
                grandChildLabel: node.grandChildLabel, 
                greatGrandChildLabel: node.greatGrandChildLabel 
            }
        });
        this.dispatchEvent(navigationEvent);
    }

    getUpdatedLabel(label) {
        if (this.recordTypeDeveloperName == 'ESTA') {
            return 'Estates - ' + label;
        } else if (this.recordTypeDeveloperName == 'COMP') {
            return 'Companies - ' + label;
        } else if (this.recordTypeDeveloperName == 'CONV') {
            return 'Conveyancing - ' + label;
        } else if (this.recordTypeDeveloperName == 'FOIR') {
            return 'FOIR - ' + label;
        } else if (this.recordTypeDeveloperName == 'GENE') {
            return 'General - ' + label;
        } else {
            return label;
        }
    }

    setTreeName(recordTypeDeveloperName) {
        if (recordTypeDeveloperName == 'ESTA') {
            this.treeName = 'Estates';
        } else if (recordTypeDeveloperName == 'COMP') {
            this.treeName = 'Companies';
        } else if (recordTypeDeveloperName == 'CONV') {
            this.treeName = 'Conveyancing';
        } else if (recordTypeDeveloperName == 'FOIR') {
            this.treeName = 'Freedom of Information';
        } else if (recordTypeDeveloperName == 'GENE') {
            this.treeName = 'General Files';
        } else {
            this.treeName = '';
        }
    }
}
