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
          parser.on('data', line => console.log(`> ${line}`));
          port.on('close',function(err){
            connected=false;
            document.getElementById('connectButton').innerHTML = "Connect";
            if(err){
              console.log(err);
            }
          });
          connected = true;
          document.getElementById('connectButton').innerHTML = "Disconnect";
        }
      }
      );
    }
    else{
      port.close();
    }
}
function go(x){
  s = x + " " + document.forms["m"+x].distance.value*document.forms["m"+x].distance_units.value + " " + document.forms["m"+x].speed.value*document.forms["m"+x].speed_units.value
  console.log(s);
  if(connected){
    port.write(s + "\n",function(err){if (err){console.log(err)}});
  }
  return false;
}
refreshPorts();