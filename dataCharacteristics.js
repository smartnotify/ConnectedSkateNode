var util = require('util');
var bleno = require('bleno');
var serialport = require('serialport');
var nmea = require('nmea');

// we want mraa to be at least version 0.6.1
var mraa = require('mraa');
var version = mraa.getVersion();
if (version >= 'v0.6.1') {
    console.log('mraa version (' + version + ') ok');
}
else {
    console.log('mraa version(' + version + ') is old - this code may not work');
}



var BlenoCharacteristic = bleno.Characteristic;

var dataCharacteristics = function() {
  dataCharacteristics.super_.call(this, {
    uuid: '34aa',
      descriptors:[
        new bleno.Descriptor({
            uuid:'2001',
            value:'Get the skate\'s data'
        })
      ],
    properties: ['read', 'write', 'notify'],
    value: null
  });

  this._value = new Buffer("Data Info For Connected Skate", "utf-8");
  console.log("Data Characterisitic's value: "+this._value);
    
  this._updateValueCallback = null;
};

util.inherits(dataCharacteristics, BlenoCharacteristic);

dataCharacteristics.prototype.onReadRequest = function(offset, callback) {
  console.log('dataCharacteristics - onReadRequest: value = ' + this._value.toString("utf-8"));

  callback(this.RESULT_SUCCESS, this._value);
};

dataCharacteristics.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  startGPSOperations();
    this._value = data;
    console.log('Data written: ' + this._value.toString("utf-8"));

  if (this._updateValueCallback) {
    console.log('dataCharacteristics - onWriteRequest: notifying');

    this._updateValueCallback(this._value);
  }

  callback(this.RESULT_SUCCESS);
};

//User has subscribed to our system, we need to send them some data back!

dataCharacteristics.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
    console.log('dataCharacteristics - onSubscribe');
    //console.log(currentLatitude + " - " +currentLongitude);
    setInterval(function(){
        //console.log(currentLatitude + " - " +currentLongitude);
        //this._updateValueCallback = currentLatitude + '|'+currentLongitude;  //You could make this cleaner and pass a json array!
        //var buf = Buffer.from(currentLatitude + '|'+currentLongitude);  // This only works with newer version of node
        //console.log("currentAltitude: " + currentAltitude);
        //console.log("Speed: " + currentSpeed);
        
        //20 bytes is the max len on BLE characteristics
        var buf = new Buffer (currentLatitude + '|' + currentLongitude+ '|' +currentAltitude + '|' +currentSpeed);
        updateValueCallback(buf);

    },1000);//we refresh with data every second or so.
  
    //The following approach is a hack, you'd be much better off writting separate characteristics :)
    // Basically sending a ping every 2 seconds with a half sec differential to let the code side
    // know we are returning something other than GPS data
    setInterval(function(){
                
        //20 bytes is the max len on BLE characteristics
        var buf = new Buffer ('aaa|' +currentAltitude + '|' +currentSpeed);
        updateValueCallback(buf);

    },2500);//we refresh with data every second or so.
    
};

dataCharacteristics.prototype.onUnsubscribe = function() {
  console.log('dataCharacteristics - onUnsubscribe');

  this._updateValueCallback = null;
};

module.exports = dataCharacteristics;


/*  Geo Data Zone */
var previousLatitude= 0.0;
var previousLongitude = 0.0;
var currentLatitude = 0.0;
var currentLongitude = 0.0;
var currentAltitude =0;
var currentSpeed = 0;
var previousTimeCheck ;
var speedCheck = 0;
var fix = false; // GPS status

function startGPSOperations (){

var u = new mraa.Uart(0);
console.log ("Let's go on GPS");

    //var port = new serialport.SerialPort(u.getDevicePath(), {
    var port = new serialport(u.getDevicePath(), {
                baudrate: 9600,
                parser: serialport.parsers.readline('\r\n')});


    //console.dir(port);
try{port.on("open",function() {
console.log("GPS  -  Connected to "+u.getDevicePath());
});
}
catch (portOpenError){ console.log (portOpenError.message);}
var roundChecker = 0;
 try{   
port.on('data', function(data) {
   
    try{
        //console.log(nmea.parse(data));
    }
    catch (err0){
        console.log ("Error parsing nmea: " + err0.message);
    }
    // Not every line of data results in a successful parse
    var loc='';
    try {
        if (nmea.parse(data)) {
            loc = nmea.parse(data); 
        } 
        else {
            return;
        }
    } 
    catch (ex) {
        console.log("Parsing issue: " + ex);   
        return;
    }
    DeviceGPS = [];  
            // Match NMEA GGA string
            if (loc.sentence === 'GGA') {
                if (loc.type === 'fix') {

                    // Convert ddmm.mmmm to degrees decimal
                    var deg = loc.lat.toString().slice(0,2);
                    var min = loc.lat.toString().slice(2)/60;
                    var d = parseFloat(deg) + parseFloat(min);

                    // Convert dddmm.mmmm to degrees decimal
                    var deg = loc.lon.toString().slice(0,3);
                    var min = loc.lon.toString().slice(3)/60;
                    var e = parseFloat(deg) + parseFloat(min);
                    
                    currentLatitude=d.toFixed(8);
                    currentLongitude=e.toFixed(8);
                    timestamp = loc.timestamp;

                    DeviceGPS.push(currentLatitude); //Latitdude FIRST
                    DeviceGPS.push(currentLongitude); //Longitude SECOND        
                    currentAltitude = parseFloat(loc.alt); // Yes, we can get altitude as well and a few other data points.  Do what you want with it!                    
                    if (isNaN(currentLatitude) || isNaN(currentLongitude))
                    {
                        fix = false;
                        currentLatitude=-1,
                        currentLongitude=-1;
                    }
                    else
                        fix = true;
                    
                } 
                else {
                    fix = false;
                }
            }
    if (fix) {
    
        //Let's get the speed.  We're using the harvesine formula for the distance.
        // https://en.wikipedia.org/wiki/Haversine_formula
        //Don't try this at home!
        //And just to be clear, you could technically geek out of your mind and include that altitude as a factor in the equation...you know just in case you are in an elevator...
        
        if (speedCheck==0){
            speedCheck ++;
            previousLatitude = currentLatitude;
            previousLongitude=currentLongitude;
            previousTimeCheck=timestamp;
        }
        else {
            roundChecker ++;
            if (roundChecker>30){
                var R = 6378137, // earth radius in meters
                dLat = (previousLatitude - currentLatitude) * (Math.PI/180),//(previousLatitude - lat) * d2r,
                dLon = (previousLongitude - currentLongitude) * (Math.PI/180), //(previousLongitude - lon) * d2r,
                lat1 = currentLatitude *  (Math.PI/180),//lat * d2r,
                lat2 = previousLatitude * (Math.PI/180),
                sin1 = Math.sin(dLat / 2),
                sin2 = Math.sin(dLon / 2);

                var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);
                var distanceBetweenPoints = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                var timeDiff=Math.abs(previousTimeCheck-timestamp);
                var speed = distanceBetweenPoints / timeDiff * 3.6; //just going for hours out of interest... Meter per seconds is what I have now.

                previousLatitude = currentLatitude;
                previousLongitude=currentLongitude;
                previousTimeCheck=timestamp;

                currentSpeed = Math.round(speed * 100) / 100 ;
//console.log("Speed: " + currentSpeed);
                
                roundChecker=0;
//                console.log ("Sending the point: lat: " + currentLatitude + "  lon: " + currentLongitude + "   alt: " + alt );

                /*
                //We don't track if it's slower than 1.5km/hr at the moment.
                if (roundedSpeed>1.4){
                    SmartNotify.smartNotifyRecordEvent (dataStream);
                    console.log ("Fast enough!");
                }
                */

            }
    
        }
    }//end of the if fix
});//end of port on data
 }
    catch (errPdata){
        console.log ("Error port read: " + errPdata);
    }
}//END OF GPS OPS