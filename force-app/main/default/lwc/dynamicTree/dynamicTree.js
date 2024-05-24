import { LightningElement, wire, track } from 'lwc';
import getTreeData from '@salesforce/apex/LayoutController.getTreeData';
import getRecordTypeId from '@salesforce/apex/LayoutController.getRecordTypeId';

export default class DynamicTree extends LightningElement {
    @track treeData;
    @track error;
    @track searchTerm = '';

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
                if (node.children) {
                    node.children = addIcons(node.children);
                }
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
                ulElement.classList.toggle('slds-is-collapsed');
                node.icon = ulElement.classList.contains('slds-is-collapsed') ? 'utility:chevronright' : 'utility:chevrondown';
                this.treeData = [...this.treeData]; // trigger reactivity
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
                detail: { recordTypeId, object, label, parentLabel }
            });
            this.dispatchEvent(navigationEvent);
        }
    }

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
    }

    get filteredTreeData() {
        if (!this.treeData || this.searchTerm === '') {
            return this.treeData;
        }
    
        const filteredData = this.treeData.map(node => {
            if (!node.children) {
                return node;
            }
    
            const filteredChildren = node.children.filter(child => {
                return child.label.toLowerCase().includes(this.searchTerm);
            });
            return { ...node, children: filteredChildren };
        });
    
        return filteredData;
    }
}