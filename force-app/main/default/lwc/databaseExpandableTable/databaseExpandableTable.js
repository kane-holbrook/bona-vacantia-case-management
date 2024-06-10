import { LightningElement, track, api } from 'lwc';

export default class DatabaseExpandableTable extends LightningElement {
    _tableData;
    _columnsMain;

    @track tableDataObj = [];

    @api
    get tableData(){
        return this._tableData;
    }

    set tableData(value){
        this._tableData = value;
        //loadlayout
    }

    @api
    get columnsMain(){
        return this.columnsMain;
    }

    set columnsMain(value){
        this._columnsMain = value;
        //loadlayout
    }

    connectedCallback(){
        this.tableData.forEach(row => {
            let values = Object.values(row);
            const item = {
                Id: row.Id,
                Cells: values
            }
            this.tableDataObj.push(item);
        });
    }
}