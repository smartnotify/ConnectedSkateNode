/*
 * You must have a 
 * BlueTooth Low Energy peripheral device on the other end or this is not going to 
 * do you much good :-)  Most phones + tablets are ok now but check to be on the safe side.
 *
 * If you are using this with an Edison, please take a look at 
 * https://software.intel.com/en-us/xdk/docs/using-templates-nodejs-iot
 * to make sure that you are setting up the BLE on the Edison properly (hint, it's not that straight forward!)
 *
 *
 * This code provided as-is by the SmartNotify team.  You are welcome to enhance it as long as you share it with others!
 */


"use strict" ;


var bleno = require('bleno');
//var WelcomeCharacteristic = require('./characteristic');
var dataCharacteristics = require('./dataCharacteristics');
var BlenoPrimaryService = bleno.PrimaryService;

console.log('****************************************************************************************************');
console.log('**** Connected Skate Node App started                                                          *****');
console.log('**** If you receive a Bluetooth Warning, you might have forgot to start it on your device *****');
console.log('**** rfkill unblock bluetooth *****');
console.log('**** killall bluetoothd (or, more permanently) systemctl disable bluetooth *****');
console.log('**** hciconfig hci0 up *****');
console.log('****************************************************************************************************');


bleno.on('stateChange', function(state) {
  console.log('Bluetooth ready -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('ConnectedSkate', ['123a']);
  }
  else {
    if(state === 'unsupported'){
      console.log("NOTE: BLE and Bleno configurations are not working.");
        //Todo...that is something to think of in terms of development and device
        //maybe have a led that can change color or blink?
        //Most boards have two Led available. Using them will be nice!
    }
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', function(error) {
  console.log('Bleno is on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new BlenoPrimaryService({
        uuid: '123a',
        characteristics: [
            new dataCharacteristics()
            //,
           // new WelcomeCharacteristic()
        
        ]
      })
    ]);
  }
});

bleno.on('accept', function(clientAddress) {
    console.log("Accepted Connection with Client Address: " + clientAddress);
});

bleno.on('disconnect', function(clientAddress) {
    console.log("Disconnected Connection with Client Address: " + clientAddress);
});