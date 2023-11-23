({
    doInit : function(component, event, helper) {
        var fileId = component.get("v.fileId");
        $A.get('e.lightning:openFiles').fire({
            recordIds: [fileId]
        });
    }
})