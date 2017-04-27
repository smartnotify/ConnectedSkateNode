var util = require('util');
var bleno = require('bleno');

var BlenoCharacteristic = bleno.Characteristic;

var WelcomeCharacteristic = function() {
  WelcomeCharacteristic.super_.call(this, {
    uuid: '34cd',
    properties: ['read', 'write', 'notify'],
    value: null
  });

  this._value = new Buffer("Welcome to the Connected Skate", "utf-8");
  console.log("Characterisitic's value: "+this._value);
    
  this._updateValueCallback = null;
};

util.inherits(WelcomeCharacteristic, BlenoCharacteristic);

WelcomeCharacteristic.prototype.onReadRequest = function(offset, callback) {
  console.log('WelcomeCharacteristic - onReadRequest: value = ' + this._value.toString("utf-8"));

  callback(this.RESULT_SUCCESS, this._value);
};

WelcomeCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  this._value = data;
    console.log('WelcomeCharacteristic - onWriteRequest: value = ' + this._value.toString("utf-8"));

  if (this._updateValueCallback) {
    console.log('WelcomeCharacteristic - onWriteRequest: notifying');

    this._updateValueCallback(this._value);
  }

  callback(this.RESULT_SUCCESS);
};

WelcomeCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('WelcomeCharacteristic - onSubscribe');

  this._updateValueCallback = updateValueCallback;
};

WelcomeCharacteristic.prototype.onUnsubscribe = function() {
  console.log('WelcomeCharacteristic - onUnsubscribe');

  this._updateValueCallback = null;
};

module.exports = WelcomeCharacteristic;