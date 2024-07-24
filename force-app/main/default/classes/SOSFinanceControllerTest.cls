@isTest
private class SOSFinanceControllerTest {
    // @IsTest
    // static void testGetPostSlips() {
    //     StaticResourceCalloutMock mock = new StaticResourceCalloutMock();
    //     mock.setStaticResource('Mock_SOSFinanceResponse');
    //     mock.setStatusCode(200);
    //     mock.setHeader('Content-Type', 'application/json');
        
    //     Test.setMock(HttpCalloutMock.class, mock);

    //     Test.startTest();
    //     SOSFinanceController controller = new SOSFinanceController();
    //     controller.MatterCode = '21609809/2';
    //     Object postSlips = controller.getPostSlips();
    //     Test.stopTest();

    //     System.assertNotEquals(null, postSlips, 'Post slips should not be null');
    // }

    // @IsTest
    // static void testGetSOSData() {
    //     StaticResourceCalloutMock mock = new StaticResourceCalloutMock();
    //     mock.setStaticResource('Mock_SOSFinanceResponseAura');
    //     mock.setStatusCode(200);
    //     mock.setHeader('Content-Type', 'application/json');
        
    //     Test.setMock(HttpCalloutMock.class, mock);

    //     Test.startTest();
    //     Map<String,Object> data = SOSFinanceController.getSOSData('21609809/2');
    //     Test.stopTest();

    //     System.assertNotEquals(null, data, 'Data should not be null');
    // }

    // @IsTest
    // static void testCreateAccrual() {
    //     StaticResourceCalloutMock mock = new StaticResourceCalloutMock();
    //     mock.setStaticResource('Mock_SOSFinanceResponse_Post');
    //     mock.setStatusCode(200);
    //     mock.setHeader('Content-Type', 'application/json');
        
    //     Test.setMock(HttpCalloutMock.class, mock);
    
    //     Test.startTest();
    //     String result = SOSFinanceController.createAccrual('21609809_2', '1234', 'leasehold land', 'Test Reference', 'CR');
    //     Test.stopTest();
    
    //     System.assertNotEquals(null, result, 'Result should not be null');
    //     // Deserialize the result to further inspect it
    //     SOSFinanceController.Response response = (SOSFinanceController.Response)JSON.deserialize(result, SOSFinanceController.Response.class);
    //     System.assertEquals('21609809/2', response.MtCode, 'MtCode should match');
    //     System.assertEquals('1234', response.NET, 'Amount should match');
    //     // Add more assertions as needed
    // }

    // @IsTest
    // static void testReverseAccrual() {
    //     StaticResourceCalloutMock mock = new StaticResourceCalloutMock();
    //     mock.setStaticResource('Mock_SOSFinanceResponse_PostReverse');
    //     mock.setStatusCode(200);
    //     mock.setHeader('Content-Type', 'application/json');
        
    //     Test.setMock(HttpCalloutMock.class, mock);
    
    //     Test.startTest();
    //     String result = SOSFinanceController.reverseAccrual('21609809_2', '1234', 'leasehold land', 'Test Reference', 'DR');
    //     Test.stopTest();
    
    //     System.assertNotEquals(null, result, 'Result should not be null');
    //     // Deserialize the result to further inspect it
    //     SOSFinanceController.Response response = (SOSFinanceController.Response)JSON.deserialize(result, SOSFinanceController.Response.class);
    //     System.assertEquals('21609809/2', response.MtCode, 'MtCode should match');
    //     System.assertEquals('1234', response.NET, 'Amount should match');
    //     // Add more assertions as needed
    // }

    @isTest
    static void temporaryTest() {
        FlowMetadataController flowMetadataController = new FlowMetadataController();
		flowMetadataController.veryTemporaryTest();
    }
}