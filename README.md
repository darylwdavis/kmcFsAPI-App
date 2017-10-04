# apiPointAndHistoryExample
Provides a framework for developing your interface to KMC Controls Commander Bx
KMC Commander Cloud – Getting Started
5 November 2015
Dave Bohlmann, KMC Controls

This document introduces the available REST API for accessing your data in the cloud.
Introduction
The cloud is running like a SkySpark derivative called J2 Finstack.  It has a RESTful API wherein you post requests and get back a ZINC, JSON or CSV “grid” for the response.  After authenticating, when you make a request you get a grid back with your answers.  This can be in one of several formats just men-tioned.  The requests are usually an invocation of an Axon script that we provide.  Axon is the query language used for the database.  Caveat: Using Zinc for results seems to work best.
These Axon functions/scripts allow you to find entities in the databased, either individuals or lists as a result of some search.  Entities are tagged to show you what they are and to let you search.  A Con-nector is an entity that represents an actual device.  It can then have Points and you can read values or properties of points.  You also can get histories of point data.
Documentation
If you go to https://commander.kmccontrols.com/doc/ there is documentation on everything the cloud service could have (some of what is documented is not necessarily turned on).  These docu-ments mainly describe how to do the programming that we have in the box, but also has the REST API so you can write your own apps and such to get to the data in the cloud, which is being sent by the Commander BX.
What is of interest, there, for your team, is over on the upper right of that web page, under “Manuals – SkySpark”.  If you go to https://commander.kmccontrols.com/doc/docSkySpark/Rest.html there is the intro on the REST API.  Note the documentation menu on the right on this page.  Over there are docs for authentication, for example.
Pay no (well, little) attention to the other “docSkySpark” documents, such as Getting Started, Pro-gramming Axon, Programming Fantom, etc. because they document functions that are not available to customers.  This is what we use to build up analytic and tagging functions, and build our simple web UI.
Tags
All entities in the cloud database are tagged with Haystack tags.  If you go back to that first ‘doc’ URL, over on the lower left is a list of Extensions.  Each extension is a set of functions and tags.  There is a lot there, and some is not turned on.  If you go to https://commander.kmccontrols.com/doc/haystack/index.html there are some basic docs on hay-stack concept.  Also, the community is at http://project-haystack.org and there is other documenta-tion there.
JS Call Wrappers
As mentioned, you do your peeking and poking by calling Axon functions, and you need to login as well.  Below are javascript snippets we use in our Web UI to do so.  We have two wrappers: one to send an Axon expression (sendExpr) and another to read and parse the resultant Zinc file (parseZinc).
In order to use the sendExpr code, you need to include JQuery as a script source (e.g., <script src="//code.jquery.com/jquery-1.11.3.min.js"></script>) or go to jquery.com and include it.

// sendExpr()
function sendExpr(expr, cb, accept, host){
  var h = '';
  if(host)
    h = 'http://'+host;
  var headers = {          
    Accept: accept||"application/json; charset=utf-8",         
    "Content-Type": "text/plain; charset=utf-8"
  };
  if(host)
    headers['Cookie'] = CookieCloud
  $.ajax({
    type: 'POST',
    url: h+'/api/demo/evalAll',   // ‘demo’ is the dbase name
    headers: headers,
    data: 'ver:"2.0"\n'+
    'expr\n'+
    '"'+expr.replace(/"/g,'\\\"')+'"',
    xhrFields: {
      withCredentials: true
    },
    success: function(data){
      cb(null, data);
    }
  });
}

// parseZinc()
function parseZinc(zinc){
  var rows = zinc.split('\n');
  var meta = rows[0];
  var headers = rows[1].split(',');
  var ret = {};

  function parseTerm(term, name){
    if(term[0] == '"')
      return term.substring(1,term.length-1);
    if(term[0] == '@')
      return term;
    if(term == 'M')
      return '?';
    if(term[term.length-1] == 'Z' || (name && name == 'mod'))
      return term;
    return parseInt(term);
  }

  ret.meta = {
    ver: meta.split(':')[1].substring(1,4)
  }
  ret.cols = [];
  for(var k = 0; k < headers.length; k++){
    var obj = {};
    obj.name = headers[k];
    ret.cols.push(obj);
  }
  ret.rows = [];
  for(var i = 2; i < rows.length; i++){
    if(!rows[i]) continue;
    var str = rows[i];
    var inQuotes = false;
    var escaped = 0;
    var termStart = 0;
    var termEnd = 0;
    var data = {};
    var termNum = 0;
    var term;
    for(var j = 0; j < str.length; j++){
      if(str[j] == '\\'){
        escaped++;
        continue;
      }
      // if not escaped, track if we're in quotes
      if((escaped % 2) == 0){
        escaped = 0;
        if(str[j] == '"'){
          inQuotes = !inQuotes;
          continue;
        }
      }
      // commas delimit if we're not in quotes
      if(str[j] == ',' && !inQuotes){
        termEnd = j-1;
        term = str.substring(termStart, termEnd+1);
        data[ret.cols[termNum].name] = parseTerm(term);
        termNum++;
        termStart = j+1;
      }
      escaped = 0;
    }
    term = str.substring(termStart);
    data[ret.cols[termNum].name] = parseTerm(term, ret.cols[termNum].name);
    termNum++;
    ret.rows.push(data);
  }
  return ret;
}

// logging in
$.ajax({
    type: 'GET',
    url: '/api/demo',
    headers: {          
      Accept: 'text/plain',         
      "Content-Type": "text/plain; charset=utf-8"
    }
  }).done(function(data, statusText, xhr){
    if(data.substring(0,3) != 'ver'){
      // we're not logged in
      $('#loginModal').modal('show');
    }else{
      //$('#cloudModal').modal('show');
    }
  });
  $('#loginModal').on('hidden.bs.modal', function(){
    location.reload();
  });
  $('#cloudModal').on('hidden.bs.modal', function(){
    if(!Connected)
      location.reload();
  });

  $('#cloud-modal-connect').click(function(){
    var host = $('#cloud-host-input').val();
    // login to cloud server
    $.ajax({
      type: 'GET',
      url: 'http://'+host+'/auth/demo/api?'+'su',
      headers: {          
        Accept: 'text/plain',         
        "Content-Type": "text/plain; charset=utf-8"
      },
      success: function(data){
        var rows = data.split('\n');
        var userSalt = rows[1].split(':')[1];
        var nonce = rows[3].split(':')[1];
        var shaObj = new jsSHA('SHA-1', "TEXT");
        shaObj.setHMACKey('su', "TEXT");
        shaObj.update('su'+':'+userSalt);
        var hmac = shaObj.getHMAC("B64");
        var shaObj2 = new jsSHA('SHA-1', 'TEXT');
        shaObj2.update(hmac+':'+nonce);
        var hash = shaObj2.getHash('B64');
        var data = 'nonce:'+nonce+'\n'+'digest:'+hash;
        $.ajax({
          type: 'POST',
          url: 'http://'+host+'/auth/demo/api?'+'su',
          headers: {          
            Accept: 'text/plain',         
            "Content-Type": "text/plain; charset=utf-8"
          },
          data: data
        }).fail(function(){
          $('#cloud-host-basicStatus').text('Invalid username or password for cloud server');
        }).done(function(data, statusText, xhr){
          CookieCloud = data.substring(data.indexOf(':')+1);
          Connected = true;
          $('#cloudModal').modal('hide');
        });
      }
    });
  });

  $('#cloud-modal-login').click(function(){
    // get the userSalt and nonce from /auth/demo/api?username
    $('#cloud-host-basicStatus').text('');
    $.ajax({
      type: 'GET',
      url: '/auth/demo/api?'+$('#cloud-host-username').val(),
      headers: {          
        Accept: 'text/plain',         
        "Content-Type": "text/plain; charset=utf-8"
      },
      success: function(data){
        var rows = data.split('\n');
        var userSalt = rows[1].split(':')[1];
        var nonce = rows[3].split(':')[1];
        var shaObj = new jsSHA('SHA-1', "TEXT");
        shaObj.setHMACKey($('#cloud-host-password').val(), "TEXT");
        shaObj.update($('#cloud-host-username').val()+':'+userSalt);
        var hmac = shaObj.getHMAC("B64");
        var shaObj2 = new jsSHA('SHA-1', 'TEXT');
        shaObj2.update(hmac+':'+nonce);
        var hash = shaObj2.getHash('B64');
        var data = 'nonce:'+nonce+'\n'+'digest:'+hash;
        $.ajax({
          type: 'POST',
          url: '/auth/demo/api?'+$('#cloud-host-username').val(),
          headers: {          
            Accept: 'text/plain',         
            "Content-Type": "text/plain; charset=utf-8"
          },
          data: data
        }).fail(function(){
          $('#cloud-host-basicStatus').text('Invalid username or password');
        }).done(function(data, statusText, xhr){
          Cookie = data.substring(data.indexOf(':')+1);
          location.reload();
        });
      }
    });
  });
Getting Data
A Device is tagged as an ‘equip’, so searching through the database for all entities with that tag will get you the list.  The main Axon function for reading that we use is readAll().
  sendExpr('readAll(equip)', function(err,data){
    data = parseZinc(data);});
The ‘equip’ says we are looking for equipment, which could be anything.  We can replace that with ‘meter’ and find meters.
We can filter the search by looking for a particular name using find() and search on the ‘dis’ tag:
  sendExpr('readAll(equip).find(c => c->dis==\"'+sid+'\")', func-tion(err,data){
where ‘sid’ is a string identifier.

The following are other typical Axon calls.  Note that double quotes need to be escaped when being passed to sendExpr, which are not shown in the following examples but were shown above.

•	Get device list
readAll(equip)

•	Find particular device(s) that match criteria, such as those marked as VAVs or are meters

readAll(vav)
		Returns a list of all devices with a vav tag.

readAll(meter)
		Returns a list of devices with a meter tag.

readAll("unit==kWh")
Returns a list of points with kWh unit of measure.

readAll(parseFilter("point and schedulable>=0"))
Returns a list of points that can be scheduled.

readAll(equip).findAll resultRow => re-sultRow.dis.contains("RTU1")
Returns equipment named “RTU1”.

•	Find all points that are energy points on a device
readAll(equipRef==kmcObjectNameToId("ElecMeter","equip") and en-ergy)
Returns an energy point connected to a device named “ElecMeter”

•	Find all points that are energy points in the systems

readAll(energy)

Returns all energy points in the project.

•	Get history of energy values

readAll(equipRef==kmcObjectNameToId("ElecMeter","equip") and en-ergy).hisRead(today)
Returns today’s energy history from the ElecMeter device. 

You can replace “today” with a specific date:
.hisRead(2015-10-01)
Returns the history from October 1.

Or use a date range:
.hisRead(2015-10-01..2015-10-08)
Returns the history from October 1 through October 8

•	Read the present value of a BACnet point
bacnetReadObjectProperty(kmcConnNameToId("Room 103"),"AV40", "present_value")
Reads the present value of property AV40 on a connector named “Room 103”


•	Set the present value of a BACnet point
bacnetWriteObjectProperty(kmcConnNameToId("Room 103"),"AV40", "present_value", 77, 8)
Writes a value of 77 at priority 8 to property AV40 on a connector named “Room 103”
