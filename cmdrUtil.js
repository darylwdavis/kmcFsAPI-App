function sendExpr(expr, cb, accept, host, pname){
  var h = '';
  if(host)
    h = host;
  var headers = {          
    Accept: accept||"application/json; charset=utf-8",         
    "Content-Type": "text/plain; charset=utf-8"
  };
  if(host)
    headers['Cookie'] = Cookie
  var data = 'ver:"2.0"\n'+
    'expr\n'+
    '"'+expr.replace(/"/g,'\\\"')+'"';
    console.log(h+'/api/'+(pname?pname:project)+'/evalAll')
  $.ajax({
    type: 'POST',
    url: h+'/api/'+(pname?pname:project)+'/evalAll',
    headers: headers,
    data: data,
    xhrFields: {
      withCredentials: true
    },
    error: function(err){
      cb(err);
    },
    success: function(data){
      cb(null, data);
    }
  });
}

function parseZinc(zinc){
      var ret = {};
      ret.cols = [];
      ret.rows = [];
  if(zinc){
      var rows = zinc.split('\n');
      var meta = rows[0];
      var headers = rows[1].split(',');

      function parseTerm(term, name){
        if(term[0] == '"')
          return term.substring(1,term.length-1);
        if(term[0] == '@')
          return term;
        if(term[0] == '`')
          return term;
        if(term == 'M')
          return '✓';
        if(term[term.length-1] == 'Z' || (name && name == 'mod'))
          return term;
        return parseInt(term);
      }
      meta=meta.split(':');
      var version =meta[1].substring(1,4);
      var wId='';
      if(meta[2]){
        if(meta[2].split(' ')[1]=='watchId'){wId=replaceAll(meta[3],'"','');}
      }
      ret.meta = {
        ver: version,
        watchId: wId
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
        var inCoords = false;
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
        // if not escaped, track if we're in geoCoord
          if((escaped % 2) == 0){
            escaped = 0;
            if(str[j] == 'C' && str[j+1] == '('){
              inCoords = true;
              continue;
            }
            if(str[j] == ')'){
              inCoords = false;
              continue;
            }
          }
          // commas delimit if we're not in quotes or coordinates
          if(str[j] == ',' && !inQuotes && !inCoords){
            if (ret.cols[termNum]){
                termEnd = j-1;
                term = str.substring(termStart, termEnd+1);
                data[ret.cols[termNum].name] = parseTerm(term);
                termNum++;
                termStart = j+1;
            }
          }
          escaped = 0;
        }
        term = str.substring(termStart);
        if (ret.cols[termNum]){
            data[ret.cols[termNum].name] = parseTerm(term, ret.cols[termNum].name);
            termNum++;
            ret.rows.push(data);
        }
      }
      return ret;
    }else{
      return ret
    }
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

var Cookie;
var Connected = false;
var autoUpdate=false;
$(document).ready(function(){
  $('#navbar-subtitle-host').text('Host: '+host);
  $('#navbar-subtitle-project').text('Project: '+project);
  $('#watch-subscribe').click(function(){
    watchOpen();
  });
  $('#get-history').click(function(){
    readAHistory();
  });
  $('#navbar_logout').click(function(){
    logout();
  });
  $('#update-timer-enable').click(function(){
    if($('#update-timer-enable').text()=='Updating...'){
      clearTimeout(updateTimeout);
      watchClose();
      autoUpdate=false;
      $('#update-timer-enable').text('Auto Update')
    }else{
      autoUpdate=true;
      update();
      $('#update-timer-enable').text('Updating...')
    }
  });
  $('#cloud-host-username').keyup(function(event){
      if ( event.which == 13 ) {
           $('#cloud-host-password').focus();
      }
   });
   $('#cloud-host-password').keyup(function(event){
      if ( event.which == 13 ) {
          $('#cloud-modal-login').click();
      }
   });
   $('#loginModal').on('shown.bs.modal', function (){
     $('#cloud-host-username').focus();
   });
  $('#cloud-modal-login').click(function(){
    // get the userSalt and nonce from /auth/CloudProjectName/api?username
    $('#cloud-host-basicStatus').text('');
      var headers = {          
        Accept: "application/json; charset=utf-8",         
        "Content-Type": "text/plain; charset=utf-8"
      };
    if(host)
        headers['Cookie'] = Cookie
    $.ajax({
      type: 'GET',
      url: host+'/auth/'+project+'/api?'+$('#cloud-host-username').val(),
      headers: headers,
      xhrFields: {
        withCredentials: true
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
          url: host+'/auth/'+project+'/api?'+$('#cloud-host-username').val(),
          headers: headers,
          xhrFields: {
            withCredentials: true
          },
          data: data,
          success: function(data){
            Cookie = data.substring(data.indexOf(':')+1);
            Connected = true;
            location.reload();
            $('#loginModal').modal('hide');
          }
        }).fail(function(){
          $('#cloud-host-basicStatus').text('Invalid username or password');
        });
      }
    });
});

function logout(){
    var headers = {
      Accept: "application/json; charset=utf-8",
      "Content-Type": "text/plain; charset=utf-8"
    };
    $.ajax({
      type: 'GET',
      url: host+'/auth/'+project+'/logout',
      headers: headers,
      xhrFields: {
        withCredentials: true
      },
      success: function(data){
          Connected = false;
          location.reload();
          }
      })
 }

sendExpr('read(kmcInstallProfiles)', function(err, data){
  if(err) return;
  if(data.substring(0,3)=='<ht'||data.substring(0,3)=='<!D'){
     return $('#loginModal').modal('show');
  }

}, 'text/plain',host,project);

});