import { LightningElement, api, track } from 'lwc';
import getTreeData from '@salesforce/apex/LayoutController.getTreeData';
import getRecordTypeId from '@salesforce/apex/LayoutController.getRecordTypeId';
import getRecordTypeIdForRecord from '@salesforce/apex/LayoutController.getRecordTypeIdForRecord';
import getRecordTypeDeveloperName from '@salesforce/apex/LayoutController.getRecordTypeDeveloperName';

export default class DynamicTree extends LightningElement {
    @api recordId;
    @track treeData;
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
            this.treeData = undefined;
        }
    }

    async loadTreeData() {
        try {
            const data = await getTreeData({ recordTypeDeveloperName: this.recordTypeDeveloperName });
            this.treeData = this.formatTreeData(data);
            this.error = undefined;
            this.setTreeName(this.recordTypeDeveloperName);

            // Automatically open the first navigable node
            this.openFirstNavigableNode(this.treeData);
        } catch (error) {
            this.error = error;
            this.treeData = undefined;
        }
    }

    formatTreeData(data) {
        const addIconsAndTabindex = (nodes, level = 1) => {
            return nodes.map(node => {
                let newNode = { ...node };
                newNode.icon = 'utility:chevronright';
                newNode.hasChildren = newNode.children && newNode.children.length > 0;
                newNode.tabindex = level === 1 ? 0 : -1; // For the expand/collapse button
                newNode.labelTabindex = newNode.hasChildren ? -1 : (level === 1 ? 0 : -1); // For the label
                newNode.level = level;
                if (newNode.hasChildren) {
                    newNode.children = addIconsAndTabindex(newNode.children, level + 1);
                }
                newNode.expandedClass = 'slds-is-collapsed';
                return newNode;
            });
        };
        return addIconsAndTabindex(data);
    }

    openFirstNavigableNode(nodes) {
        for (const node of nodes) {
            if (node.object) {
                // If the node has an object, it is navigable
                this.dispatchNavigationEvent(node);
                return;
            } else if (node.children && node.children.length > 0) {
                // Recursively check the children
                this.openFirstNavigableNode(node.children);
                return;
            }
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
                parentLabel: node.label, 
                grandChildLabel: node.label, 
                greatGrandChildLabel: node.label 
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

    handleToggle(event) {
        const label = event.currentTarget.dataset.label;
        const findNodeAndUpdate = (nodes, isExpanded) => {
            for (let node of nodes) {
                if (node.label === label) {
                    const ulElement = event.currentTarget.closest('li').querySelector('ul');
                    if (ulElement) {
                        const isCollapsed = ulElement.classList.toggle('slds-is-collapsed');
                        node.icon = isCollapsed ? 'utility:chevronright' : 'utility:chevrondown';
                        node.expandedClass = isCollapsed ? 'slds-is-collapsed' : '';

                        // Update tabindex for immediate children
                        if (node.children) {
                            node.children.forEach(child => {
                                child.tabindex = isCollapsed ? -1 : 0;
                                child.labelTabindex = child.hasChildren ? -1 : (isCollapsed ? -1 : 0);
                                // If collapsing, ensure all descendants are not tabbable
                                if (isCollapsed) {
                                    this.updateDescendantTabindex(child, -1);
                                }
                            });
                        }

                        // Update icon
                        const iconElement = event.currentTarget.querySelector('lightning-icon');
                        if (iconElement) {
                            iconElement.iconName = node.icon;
                        }

                        // Set active-label class
                        const previouslyActive = this.template.querySelector('.active-label');
                        if (previouslyActive) {
                            previouslyActive.classList.remove('active-label');
                        }
                        const clickedLabelDiv = event.currentTarget.closest('.slds-tree__item');
                        clickedLabelDiv.classList.add('active-label');
                    }
                    return true;
                }
                if (node.children) {
                    if (findNodeAndUpdate(node.children, node.expandedClass !== 'slds-is-collapsed')) {
                        return true;
                    }
                }
            }
            return false;
        };

        findNodeAndUpdate(this.treeData);
        this.treeData = JSON.parse(JSON.stringify(this.treeData));
    }

    updateDescendantTabindex(node, tabindex) {
        if (node.children) {
            node.children.forEach(child => {
                child.tabindex = tabindex;
                child.labelTabindex = child.hasChildren ? -1 : tabindex;
                this.updateDescendantTabindex(child, tabindex);
            });
        }
    }

    async handleNavigation(event) {
        const previouslyActive = this.template.querySelector('.active-label');
        if (previouslyActive) {
            previouslyActive.classList.remove('active-label');
        }
    
        // We apply it to the tree item instead, otherwise it won't cover the full width
        const clickedLabelDiv = event.currentTarget.closest('.slds-tree__item');
        // We have the label separately, so clicking it triggers the expand/collapse event
        const clickedLabel = event.currentTarget;
        clickedLabelDiv.classList.add('active-label');
    
        const label = event.currentTarget.dataset.label;
        const object = event.currentTarget.dataset.object;
        const parentLabel = event.currentTarget.dataset.parentLabel;
        const grandChildLabel = event.currentTarget.dataset.parentGrandchildLabel;
        const greatGrandChildLabel = event.currentTarget.dataset.parentGreatgrandchildLabel;
    
        // Toggle submenu visibility
        const submenu = event.currentTarget.closest('li').querySelector('ul');
        if (submenu) {
            submenu.classList.toggle('slds-is-collapsed');
            const icon = submenu.classList.contains('slds-is-collapsed') ? 'utility:chevronright' : 'utility:chevrondown';
            // Update icon for the clicked label
            const iconElement = clickedLabel.closest('.slds-tree__item').querySelector('lightning-icon');
            if (iconElement) {
                iconElement.iconName = icon;
            }
        }
    
        if (object) {
            let updatedLabel = label;
            if (this.recordTypeDeveloperName == 'ESTA') {
                updatedLabel = 'Estates - ' + label;
            } else if (this.recordTypeDeveloperName == 'COMP') {
                updatedLabel = 'Companies - ' + label;
            } else if (this.recordTypeDeveloperName == 'CONV') {
                updatedLabel = 'Conveyancing - ' + label;
            } else if (this.recordTypeDeveloperName == 'FOIR') {
                updatedLabel = 'FOIR - ' + label;
            } else if (this.recordTypeDeveloperName == 'GENE') {
                updatedLabel = 'General - ' + label;
            } else {
                updatedLabel = label;
            }

            const recordTypeId = await getRecordTypeId({ objectName: object, recordTypeName: updatedLabel });
            const navigationEvent = new CustomEvent('navigate', {
                detail: { recordTypeId, object, label, parentLabel, grandChildLabel, greatGrandChildLabel }
            });
            this.dispatchEvent(navigationEvent);
        }
    }

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.isSearchActive = !!this.searchTerm;
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

    get filteredTreeData() {
        if (!this.treeData) {
            return [];
        }
        if (this.searchTerm === '') {
            this.isSearchActive = false;
            return this.treeData.map(node => ({
                ...node,
                icon: 'utility:chevronright', // Reset icon to default
                expandedClass: 'slds-is-collapsed' // Ensure all nodes are collapsed by default
            }));
        }

        const filterNodes = (nodes) => {
            return nodes.reduce((filtered, node) => {
                const isMatch = node.label.toLowerCase().includes(this.searchTerm);
                if (isMatch && !node.hasChildren) {
                    filtered.push({
                        ...node,
                        expandedClass: '', // Expanded to show the matched node
                        icon: 'utility:chevronright' // Reset icon for matched nodes without children
                    });
                } else if (node.children) {
                    const filteredChildren = filterNodes(node.children);
                    if (filteredChildren.length) {
                        filtered.push({
                            ...node,
                            children: filteredChildren,
                            expandedClass: '',
                            icon: 'utility:chevronright'
                        });
                    }
                }
                return filtered;
            }, []);
        };

        const filteredData = filterNodes(this.treeData);
        return filteredData.sort((a, b) => a.label.localeCompare(b.label));
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (event.currentTarget.dataset.object) {
                this.handleNavigation(event);
            } else {
                this.handleToggle(event);
            }
        }
    }
}
