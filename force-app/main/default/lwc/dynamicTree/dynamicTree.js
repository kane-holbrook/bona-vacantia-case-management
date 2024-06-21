import { LightningElement, wire, track } from 'lwc';
import getTreeData from '@salesforce/apex/LayoutController.getTreeData';
import getRecordTypeId from '@salesforce/apex/LayoutController.getRecordTypeId';

export default class DynamicTree extends LightningElement {
    @track treeData;
    @track error;
    @track searchTerm = '';
    @track isSearchActive = false;

    @wire(getTreeData)
    wiredTreeData({ error, data }) {
        if (data) {
            this.treeData = this.formatTreeData(JSON.parse(JSON.stringify(data)));
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.treeData = undefined;
        }
    }

    formatTreeData(data) {
        const addIcons = (nodes) => {
            return nodes.map(node => {
                node.icon = 'utility:chevronright';
                node.hasChildren = node.children && node.children.length > 0;
                if (node.hasChildren) {
                    node.children = addIcons(node.children);
                }
                node.expandedClass = 'slds-is-collapsed'; // Set default state to collapsed
                return node;
            });
        };
        return addIcons(data);
    }

    handleToggle(event) {
        const label = event.currentTarget.dataset.label;
        const findNode = (nodes) => {
            for (let node of nodes) {
                if (node.label === label) {
                    return node;
                }
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        };
    
        const node = findNode(this.treeData);
        if (node) {
            const ulElement = event.currentTarget.closest('li').querySelector('ul');
            if (ulElement) {
                const isCollapsed = ulElement.classList.toggle('slds-is-collapsed');
                node.icon = isCollapsed ? 'utility:chevronright' : 'utility:chevrondown';
                node.expandedClass = isCollapsed ? 'slds-is-collapsed' : '';
                
                // Directly update the icon element
                const iconElement = event.currentTarget.querySelector('lightning-icon');
                if (iconElement) {
                    iconElement.iconName = node.icon;
                }
                
                // Set the active-label CSS class
                const previouslyActive = this.template.querySelector('.active-label');
                if (previouslyActive) {
                    previouslyActive.classList.remove('active-label');
                }
                const clickedLabelDiv = event.currentTarget.closest('.slds-tree__item');
                clickedLabelDiv.classList.add('active-label');
                
                // Re-assign the treeData to trigger reactivity
                this.treeData = JSON.parse(JSON.stringify(this.treeData));
            }
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
            const recordTypeId = await getRecordTypeId({ objectName: object, recordTypeName: label });
            const navigationEvent = new CustomEvent('navigate', {
                detail: { recordTypeId, object, label, parentLabel, grandChildLabel }
            });
            this.dispatchEvent(navigationEvent);
        }
    }

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.isSearchActive = !!this.searchTerm;
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
                        filtered.push(...filteredChildren);
                    }
                }
                return filtered;
            }, []);
        };
    
        const filteredData = filterNodes(this.treeData);
        return filteredData.sort((a, b) => a.label.localeCompare(b.label));
    }
}