"use strict";

var Cylon = require('cylon', 'cylon-ardrone');

Cylon.robot({
  connections: {
    leapmotion: { adaptor: 'leapmotion' }
  },

  devices: {
    leapmotion: { driver: 'leapmotion' }
  },

  work: function(my) {
    my.leapmotion.on('hand', function(hand) {
      var position = hand.palmPosition.join(',');
      console.log("Hand position: " + position);
    });
  }
});