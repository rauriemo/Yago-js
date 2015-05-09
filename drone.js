"use strict";

var Cylon = require('cylon');

Cylon.robot({

  connections: {
    ardrone: { adaptor: 'ardrone', port: '192.168.1.1' },
    keyboard: { adaptor: 'keyboard' }
  },

  devices: {
    drone: { driver: 'ardrone', connection: 'ardrone' },
    keyboard: { driver: 'keyboard', connection: 'keyboard' }
  },



  work: function(my) {
    // console.log(my.drone)
    my.keyboard.on("keypress", function(key) {
      console.log(key.name + " PRESSED!");
      if (key.name === "t") {
        console.log("LIFT OFF!");
        my.drone.takeoff();
      }else if (key.name === "h"){
        console.log("hovering");
        my.drone.hover();
      }else if (key.name === "q"){
        console.log("Landing!");
        my.drone.land();
        my.drone.stop();
      }else if (key.name === "z"){
        console.log("CALIBRATE");
        my.drone.calibrate();
      }else if (key.name === "up"){
        console.log("going up");
        my.drone.up(0.5);
      }else if (key.name === "down"){
        console.log("going down");
        my.drone.down(0.5);
      }else if (key.name === "left"){
        console.log("turning left");
        my.drone.counterClockwise(0.5);
      }else if (key.name === "right"){
        console.log("turning right");
        my.drone.clockwise(0.5);
      }else if (key.name === "w"){
        console.log("going forward");
        my.drone.front(0.5);
      }else if (key.name === "a"){
        console.log("going left");
        my.drone.left(0.5);
      }else if (key.name === "s"){
        console.log("going back");
        my.drone.back(0.5);
      }else if (key.name === "d"){
        console.log("going right");
        my.drone.right(0.5);
      }else if (key.name === "f"){
        console.log("front flip time!!");
        my.drone.frontFlip();
      }else if (key.name === "g"){
        console.log("back flip time!!");
        my.drone.backFlip();
      }else if (key.name === "c"){
        console.log("left flip time!!");
        my.drone.leftFlip();
      }else if (key.name === "v"){
        console.log("right flip time!!");
        my.drone.rightFlip();
      }else if (key.name === "x"){
        console.log("LED BOMB");
        my.drone.animateLeds();
      }else if (key.name === "r"){
        console.log("wave hello, Yago");
        my.drone.wave();
      }
    });
    // w,a,s,d,f,g,c,v,z,x,q,r,t,up,left,down,right

  }
}).start();