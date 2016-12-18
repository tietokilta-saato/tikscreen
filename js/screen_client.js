
//Define some time intervals
var INTERVAL_SEC = 1000; //one-second interval
var INTERVAL_MIN = 60 * 1000; //one-minute interval
var INTERVAL_HOUR = 60 * INTERVAL_MIN; //one-hour interval

//To prevent weird behavior, reload the whole page every now and then
var pageReloadTimer = setInterval(function(){location.reload();}, 6 * INTERVAL_HOUR);


// "MAIN"
$(document).ready(function(){

	// START CLOCK
	loadClock();
	var clockTimer = setInterval(function(){
		loadClock();
	}, INTERVAL_SEC);


	// OUTSIDE TEMPERATURE
	var weather_url = 'http://outside.aalto.fi/data.txt';
	loadWeather(weather_url);
	var weatherTimer = setInterval(function() {
		loadWeather(weather_url);
	}, INTERVAL_MIN * 10);


	// SODEXO TODAY'S MENU
	var sodexo_url = getSodexoUrl();
	loadSodexo(sodexo_url);


	// BUS STOPS
	var hsl_url = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
	loadBusStops(hsl_url);
	/*var busTimer = setInterval(function(){
		loadBusStops(hsl_url);
	}, INTERVAL_MIN); */


	// TIETOKILTA EVENTS 
	//TODO loadEvents
	var event_url = 'http://tietokilta.fi/tapahtumat #pageWrapper'; //note the selector
	$('#eventdummy').load(event_url, function(){
		displayEvents();
	});
	var eventTimer = setInterval(function() {
		$('#eventdummy').load(event_url, function(){
			displayEvents();
		});
	}, INTERVAL_HOUR);

});



/*
	CLOCK & DATE
*/
function loadClock(){
	var clock = new Date();
	var hours = clock.getHours();
	var mins = clock.getMinutes();
	if(mins<10)
		mins = '0'+mins;

	var time = hours + ':' + mins;

	var weekday = new Array(7);
	weekday[0] = "Sunday";
	weekday[1] = "Monday";
	weekday[2] = "Tuesday";
	weekday[3] = "Wednesday";
	weekday[4] = "Thursday";
	weekday[5] = "Friday";
	weekday[6] = "Saturday";

	var wday = weekday[clock.getDay()];

	var date = clock.getDate() + '.' + (clock.getMonth() + 1) + '.';
	$('#clockDisp').text(time);
	$('#dateDisp').text(wday+' '+date);
}


/*
	OUTSIDE TEMPERATURE
*/
function loadWeather(url){
	$.get(url, function(raw) {
		var data = JSON.parse(raw);
		$('#weather').text(Math.round(data["gent-outside-t"]) + ' °C');
	});
}


/*
	SODEXO & SUBWAY MENUS
*/
function loadSodexo(sodexo_url){
	$.get(sodexo_url, function(data){
		for(var i=0; i < data.courses.length; i++){
			var entry =  '<div class="sodexoItem">';
			entry += '<h4>'+data.courses[i].title_fi+'</h4>';
			entry += '<h4>'+data.courses[i].title_en+'</h4>';
			entry += '</div>';
			$('#sodexoContainer').append(entry);
		}
	});

}

function getSodexoUrl(){
	var base = 'http://www.sodexo.fi/ruokalistat/output/daily_json/142/';
	var d = new Date();
	var y = d.getFullYear();
	var m = d.getMonth() + 1;
	var day = d.getDate();
	return base + y+'/'+m+'/'+day+'/fi';
}


/*
	BUS STOPS
*/
function loadBusStops(hsl_url){

	var ndeps = 5;
	var stop_alvari1 = 'HSL:2222211';
	var stop_alvari2 = 'HSL:2222235';
	var deps = [];

	var q1 = '{ stop(id: "'+stop_alvari1+'"){ name '
			+'stoptimesWithoutPatterns(numberOfDepartures:'+ndeps+'){ '
			+'scheduledArrival trip{ tripHeadsign route{shortName} }}'
			+'}}';

	$.ajax({
		url: hsl_url,
		headers: {"Content-Type":"application/graphql"},
		method: "POST", 
		data: q1
		}).done(function(d) {
			if(!d.data.stop) return;
			for(var k = 0; k < d.data.stop.stoptimesWithoutPatterns.length; k++){
				deps.push(d.data.stop.stoptimesWithoutPatterns[k]);
			}
			console.log(deps);
		});

}

function displayBusStops(stop, deps){

}

function convertSecondsToClockString(s){
	var h = (s / 3600) % 24 | 0;
	var m = (s % 3600) / 60 | 0;
	if(h<10)
		h = '0' + h;
	if(m<10)
		m = '0' + m;
	return h+':'+m;
}


function cleanBusCode(long_code) {
	var short_code = long_code.slice(1).split(" ")[0];
	if ( short_code[0] == "0" ) {
		short_code = short_code.slice(1);
	}
	return short_code;
}

function cleanTimeCode(old_code){
	old_code = old_code.toString();
	if(old_code.length < 4){
		old_code = '0'+old_code;
	}
	return old_code.substr(0, 2)%24 + ':' + old_code.substr(2);
}



function callHSL(api_url, busstop_id, element_id) {
	var target = $("#seBusInfo");
	if (element_id == "nw")
		target = $("#nwBusInfo");

	var TIME_LIMIT = "240"; //max minutes to future
	var DEP_LIMIT = "10"; //max number of departures to fetch

	$.getJSON(api_url+"&request=stop&code="+busstop_id+"&time_limit="+TIME_LIMIT+"&dep_limit="+DEP_LIMIT, function(data) {
		var deps = data[0].departures;
		var times = [];
		var timetable = "<table>";
		$(deps).each(function( index ) {
			//console.log(this);
			var buscode = cleanBusCode(this.code);
			var timecode = cleanTimeCode(this.time);
			var row = "<tr><td>" + timecode + "</td><td>" + buscode + "</td></tr>";
			times.push(row);
		});
		if (times.length == 0) {
			timetable += "<tr><td>No more buses today ;__;</td></tr>";
		}
		for (var i = 0; i < times.length; i++) {
			timetable += times[i];
		}
		target.html(timetable);
	});
}




/*
	GUILD EVENTS
*/
function displayEvents(){

	var eventItems = '';

	$('#eventdummy .briefEventListing').each(function(i){
		var titlerow = $(this).find('.eventTitle').text().trim().split(' @ ');
		var meta = $(this).find('.eventMeta').text().trim();
		var title = titlerow[0];
		var location = titlerow[1];
		var date = wdToEnglish(meta.substring(0, 9)); //ma xx.yy. -> Mon xx.yy.

		var hours = meta.substring(10, 19);
		if(hours.substring(0,3) === 'klo'){
			date += hours.substring(3);
		}

		var signup = '';
		var probe = $.grep(getSignups(), function(e){ return e.title === title; });
		if (probe.length == 1) {
			signup = ' <i class="fa fa-group"></i> '+probe[0].amount;
		}

		var desc = '';
		var label = getLabel(date);
		
		if(label !== 'later'){ //show desc if today or tommorow
			var time = 'All day';
			var descPart = meta.substring(9);
			if(date.length > 10){
				time = date.substring(10);
				descPart = meta.substring(19);
			}
			date = label + ' ' + time;
			desc = '<p class="descrow">'+descPart+'</p>';
		}

		var tab = '<span class="wide-space"></span>';
		var specs = '<i class="fa fa-clock-o fa-lg"></i> '+date+tab+
		' <i class="fa fa-map-marker fa-lg"></i> '+location+tab+signup;

		eventItems += '<div class="evtItem pure-g"><div class="pure-u-1"><h2>	'+title+
			'</h2></div><div class="pure-u-1"><h3 class="specrow">'+
			specs+'</h3>'+desc+'</div></div>';
	});

	$('#eventContainer').html(eventItems);

	function wdToEnglish(str){
	var fiEn = { 'ma' : 'Mon',
			'ti' : 'Tue',
			'ke' : 'Wed',
			'to' : 'Thu',
			'pe' : 'Fri',
			'la' : 'Sat',
			'su' : 'Sun' };
	return fiEn[str.substring(0,2)]+' '+str.substring(3);
	}

	function getLabel(dateStr){
		var now = new Date();
		var dateArr = dateStr.substring(4).split('.');
		var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

		// check if date is today
		if(now.getDate() == dateArr[0] && (now.getMonth()+1) == dateArr[1]){
			// return '<div class="labeltag">TODAY</div>'; //old today-tag
			return '<b>TODAY</b>';
		}
		// or tomorrow
		else if(tomorrow.getDate() == dateArr[0] && (tomorrow.getMonth()+1) == dateArr[1]){
			//return '<div class="labeltag">TOMORROW</div>'; //old tomorrow-tag
			return '<b>TOMORROW</b>';
		}
		else {
			return 'later';
		}
	}

	function getSignups(){
		var signups = [];
		$('#eventdummy .briefSignupListing').each(function(){
			var title = $(this).children('.signupTitle').text().trim();
			var amount = $(this).children('.signupMeta').text().trim().substring(17);
			var obj = {'title' : title, 'amount' : amount};
			signups.push(obj);
		});
		return signups;
	}

}

