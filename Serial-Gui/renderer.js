// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require("fs");
const serialport = require('serialport');
var SerialPort = serialport.SerialPort;
const Readline = require('@serialport/parser-readline');
var ports = [undefined,undefined];
var connected = [false,false];
var waiting = false;
var inQueues = [[],[]];
var outQueues = [[],[]];
var arduReady = false;
var nanoVeri = false;
var mults = [32/0.09,-8*200/0.8]
var logs = [];
var last = ["","","",""];
var logging = false;
function refreshPorts(){
  if (!connected[0])
  document.forms.serial0.getElementsByTagName("select").portselect.innerHTML = '';
  if (!connected[1])
  document.forms.serial1.getElementsByTagName("select").portselect.innerHTML = ''
  serialport.list(function (err, portl) {
    portl.forEach(function(port) {
      if (!connected[0]) {
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        document.forms.serial0.getElementsByTagName("select").portselect.appendChild(opt);
      }
      if (!connected[1]){
        var opt = document.createElement('option');
        opt.value = port.comName;
        opt.innerHTML = port.comName + " - " + port.manufacturer;
        document.forms.serial1.getElementsByTagName("select").portselect.appendChild(opt);
      }
    });
  });
}
function connect(x){
    if (!connected[x]){
      var select = document.forms["serial"+x].getElementsByTagName("select").portselect;
      var baud = document.forms["serial"+x].getElementsByTagName("select").baudrate;
      ports[x] = new serialport(select.options[select.selectedIndex].value, { baudRate: parseInt(baud.options[baud.selectedIndex].value) },
        function (err) {
          if (err) {
            return console.log('Error: ', err.message)
          }
          else{
            parser = new Readline()
            ports[x].pipe(parser)
            parser.on('data', line => inQueues[x].push(line.replace(/(\r\n|\n|\r)/gm,"")));
            ports[x].on('close',function(err){
              connected[x] = false;
              outQueues[x] = []
              document.forms["serial"+x].getElementsByTagName("input")[0].value = "Connect";
              if(err){
                console.log(err);
              }
            });
            if(x == 0){
              arduReady = false;
            }
            else{
              nanoVeri = false;
            }
            connected[x] = true;
            document.forms["serial"+x].getElementsByTagName("input")[0].value = "Disconnect";
            outQueues[x] = [];
          }
        }
      );
    }
    else{
      ports[x].close();
    }
}
function parseQueues(){ 
  while(inQueues[0].length){
    incomingArdu(inQueues[0].pop());
  }
  while(inQueues[1].length){
    incomingVolt(inQueues[1].pop());
  }
  setTimeout(parseQueues,20);
}
setTimeout(parseQueues, 20);
/*function parseOutQueues(){ 
  while(outQueues[0].length){
    incomingArdu(outQueues[0].pop());
  }
  while(outQueues[1].length){
    incomingVolt(outQueues[1].pop());
  }
  setTimeout(parseOutQueues,20);
}
setTimeout(parseOutQueues, 20);*/
function poll(){
  if(logging){
	logs.push(last);
	last = [new Date().getTime(),"","",""];
  }
  if(connected[0] & arduReady){
    ports[0].write("r\n",function(err){if (err){console.log(err)}});
  }
  if(connected[1]){
    if(!nanoVeri){
      ports[1].write(":CONFigure:VOLTage:DC\n",function(err){if (err){console.log(err)}});
      ports[1].write(":INITiate:CONTinuous ON\n",function(err){if (err){console.log(err)}});
      nanoVeri = true;
    }
    else{
      ports[1].write(":FETCH?\n");
    }
  }
  setTimeout(poll, parseFloat(document.getElementById("poll").value)*1000);
}
setTimeout(poll, parseFloat(document.getElementById("poll").value)*1000);
function incomingArdu(line){
  console.log("Arduino: "+line)
  if(line == "RD"){
    arduReady = true
  }
  else if(line[0] == 't'){
    var res = line.split(":");
    document.getElementById("t1").innerHTML = res[2];
    document.getElementById("t2").innerHTML = res[4]; 
	last[1] = res[2];
	last[2] = res[4];
  }
  else if(line.startsWith("done")){
    console.log("DONE");
    if(outQueues[0].length == 0){
      waiting = false;
    }
    else{
      to_send = outQueues[0].shift();
      sendCommand(to_send);
      document.getElementById("queueCount").innerHTML = outQueues[0].length;
    }
  }
}
function incomingVolt(line){
  document.getElementById("voltage").innerHTML = line;
  last[3] = line;
}
function light(){
  if(connected[0] & arduReady){
    que("l\n");
  }
}
function go(x){
  motor(x,parseInt(document.forms["m"+x].distance.value))
  return false;
}
function motor(mot,distance){
  s = "m" + mot + " " + Math.round(distance*mults[mot]);
  if(connected[0]){
    que(s + "\n");
  }
}
function delay(ms){
  que("d"+ms+"\n");
}
function startLog(){
  que("s");
}
function endLog(name){
  que("e"+name);
}
function que(command){
  if(waiting){
    outQueues[0].push(command);
    document.getElementById("queueCount").innerHTML = outQueues[0].length;
  }
  else{
    waiting = true;
    sendCommand(command);
  }
}
function sendCommand(command){
  if (command.startsWith("d")){
	setTimeout(function(){incomingArdu("done");}, parseInt(command.replace("d","")));
  }	
  else if (command.startsWith("s")){
	logging = true;
	logs = [];
	last = [new Date().getTime(),"","",""];
	incomingArdu("done");
  }	
  else if (command.startsWith("e")){
	logging = false;
	logs.push(last);
	console.log(logs);
	fs.open(command.substring(1), 'w', (err, fd) => {
	  if (err) throw err;
	  for (const log of logs){
		 fs.writeFileSync(fd,log+"\n"); 
	  }
	  fs.close(fd, (err) => {
		if (err) throw err;
		incomingArdu("done");
	  });
	});
  }	
  else {
	console.log(command);
	ports[0].write(command,function(err){if (err){console.log(err)}});
  }
  if(command.startsWith("l")){
	  incomingArdu("done");
  }
}
refreshPorts();
function addToQueue(){
  eval(document.forms["program"].program.value);
}
/*
*STB? //check the status register
:CONFigure:VOLTage:DC
:INITiate:CONTinuous ON
:fetch?
*/