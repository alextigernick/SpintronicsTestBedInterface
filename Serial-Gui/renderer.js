// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport');
var SerialPort = serialport.SerialPort;
const Readline = require('@serialport/parser-readline');
select = document.getElementById('portselect');
baud = document.getElementById('baudrate');
var port;
var connected = false;
var indicator = document.getElementById("indicator");
var waiting = false;
var msgQueue = [];
function refreshPorts(){
  select.innerHTML = '';
  serialport.list(function (err, ports) {
    ports.forEach(function(port) {
      var opt = document.createElement('option');
      opt.value = port.comName;
      opt.innerHTML = port.comName + " - " + port.manufacturer;
      select.appendChild(opt);
    });
  });
}
var queue = [];
function connect(){
    if (!connected){
      port = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
      function (err) {
        if (err) {
          return console.log('Error: ', err.message)
        }
        else{
          const parser = new Readline()
          port.pipe(parser)
          parser.on('data', line => msgQueue.push(line));
          port.on('close',function(err){
            connected=false;
            document.getElementById('connectButton').innerHTML = "Connect";
            if(err){
              console.log(err);
            }
          });
          connected = true;
          document.getElementById('connectButton').innerHTML = "Disconnect";
          queue = [];
        }
      }
      );
    }
    else{
      port.close();
    }
}
setInterval(function(){ while(msgQueue.length){incoming(msgQueue.pop());} }, 20);
function incoming(line){
  if(line.startsWith("home")){
    if(parseInt(line[4])){
      indicator.style.backgroundColor="green";
    }
    else{
      indicator.style.backgroundColor="red";
    }
  }
  else if(line.startsWith("done")){
    console.log("DONE");
    if(queue.length == 0){
      waiting = false;
    }
    else{
      to_send = queue.shift();
      sendCommand(to_send);
      document.getElementById("queueCount").innerHTML = queue.length;
    }
  }
  else {
    console.log(line);
  }
}
function motor(mot,distance,speed){
  s = "m" + mot + " " + distance + " " + speed;
  if(connected){
    que(s + "\n");
  }
}
function home(){
  if(connected){
    que("h\n");
  }
}
function addToQueue(){
  eval(document.forms["program"].program.value);
}
function delay(t){
  if(connected){
    que("d"+t*1000+"\n");
  }
}
function sendCommand(command){
  if (command.startsWith("d-")){
    alert('Waiting for input to continue');
    console.log("d1");
    port.write("d1\n",function(err){if (err){console.log(err)}});
  }
  else{
    console.log(command);
    port.write(command,function(err){if (err){console.log(err)}});
  }
}
function que(command){
  if(waiting){
    queue.push(command);
    document.getElementById("queueCount").innerHTML = queue.length;
  }
  else{
    waiting = true;
    sendCommand(command);
  }
}
function addToEditor(){
  gen = document.forms["gen"];
  d =  document.forms["gen"].delay_source.value == "1"?gen.spacing.value:-1;
  document.forms["program"].program.value = "";
  document.forms["program"].program.value += "for(var i = 0; i < "+gen.reps.value+"; i++){\n"
  document.forms["program"].program.value += "motor(0,"+gen.sup.value+","+gen.sspeed.value+");\n";
  document.forms["program"].program.value += "delay("+d+");\n";
  document.forms["program"].program.value += "motor(2,"+(parseInt(gen.park.value)+0.5)*10000+","+gen.rspeed.value*10000+");\n";
  document.forms["program"].program.value += "delay("+d+");\n";
  document.forms["program"].program.value += "home();\n";
  document.forms["program"].program.value += "delay("+d+");\n";
  document.forms["program"].program.value += "motor(0,-"+gen.sdown.value+","+gen.sspeed.value+");\n";
  document.forms["program"].program.value += "delay("+d+");\n";
  document.forms["program"].program.value += "motor(1,-"+gen.bdown.value+","+gen.bspeed.value+");\n";
  document.forms["program"].program.value += "delay("+d+");\n";
  document.forms["program"].program.value += "motor(2,-"+gen.park.value*10000+","+gen.rspeed.value*10000+");\n";
  document.forms["program"].program.value += "delay("+d+");\n";
  document.forms["program"].program.value += "}";
  
}
function go(x){
  motor(x,document.forms["m"+x].distance.value*document.forms["m"+x].distance_units.value,document.forms["m"+x].speed.value*document.forms["m"+x].speed_units.value)
  return false;
}
refreshPorts();