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
            console.log('tree items', this.treeItems);
            this.openFirstNavigableNode(this.treeItems); // Open the first navigable node
        } catch (error) {
            this.error = error;
            this.treeItems = [];
        }
    }

    formatTreeDataForLightningTree(data) {
        const formatNodes = (nodes, parentLabel = null, grandChildLabel = null, greatGrandChildLabel = null, path = '') => {
            return nodes.map((node, index) => {
                const currentPath = `${path}/${index}`; // Create a unique path for each node
                return {
                    label: node.label,
                    name: currentPath, // Use the unique path as the name
                    object: node.object, // Ensure object is included
                    expanded: false,
                    parentLabel: parentLabel,
                    grandChildLabel: grandChildLabel,
                    greatGrandChildLabel: greatGrandChildLabel,
                    items: node.children ? formatNodes(node.children, node.label, parentLabel, grandChildLabel, currentPath) : []
                };
            });
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

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.isSearchActive = !!this.searchTerm;
    }

    get filteredTreeData() {
        if (!this.treeItems) {
            return [];
        }
        if (this.searchTerm === '') {
            this.isSearchActive = false;
            return this.treeItems.map(node => ({
                ...node,
                icon: 'utility:chevronright', // Reset icon to default
                expandedClass: 'slds-is-collapsed' // Ensure all nodes are collapsed by default
            }));
        }

        const filterNodes = (nodes) => {
            return nodes.reduce((filtered, node) => {
                const isMatch = node.label.toLowerCase().includes(this.searchTerm);
                if (isMatch && !node.items.length) {
                    filtered.push({
                        ...node,
                        expandedClass: '', // Expanded to show the matched node
                        icon: 'utility:chevronright' // Reset icon for matched nodes without children
                    });
                } else if (node.items) {
                    const filteredChildren = filterNodes(node.items);
                    if (filteredChildren.length) {
                        filtered.push({
                            ...node,
                            items: filteredChildren,
                            expandedClass: '',
                            icon: 'utility:chevronright'
                        });
                    }
                }
                return filtered;
            }, []);
        };

        const filteredData = filterNodes(this.treeItems);
        return filteredData.sort((a, b) => a.label.localeCompare(b.label));
    }

    openFirstNavigableNode(nodes) {
        for (const node of nodes) {
            if (node.object) {
                // If the node has an object, it is navigable
                node.expanded = true; // Expand the node
                this.dispatchNavigationEvent(node); // Dispatch navigation event
                return true; // Return true to indicate a node was expanded
            } else if (node.items && node.items.length > 0) {
                // Recursively check the children
                const childExpanded = this.openFirstNavigableNode(node.items);
                if (childExpanded) {
                    node.expanded = true; // Ensure parent is expanded if a child is expanded
                    return true; // Return true to indicate a node was expanded
                }
            }
        }
        return false; // Return false if no navigable node was found
    }
}
