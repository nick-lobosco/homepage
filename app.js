var express     = require('express'),
    request     = require('request'),
    bodyParser  = require('body-parser'),
    async		 = require('async');			

var app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public')); //changes default directory

//====================================
//Global Variables
//====================================
var 	zip, coords, locality, correctZip = true;

//====================================
//Get Routes
//====================================
app.get('/', function(req, res){
	async.waterfall([
		function(callback){
			if(coords){
				request('http://dev.virtualearth.net/REST/v1/Traffic/Incidents/'+coords+'key=ArLa6JxoMs4uT_XJfS6sgsFm7mXq8HXwvmDblyyBce9V8JMma-csh_6Dj6cnzKRn', function(err, response, body){
					var incidents = JSON.parse(body)['resourceSets'][0]['resources'];
					callback(null, incidents);
				})
			}
			else
				callback(null, null);
		},
		function(incidents, callback){
			if(zip){
				request('http://api.openweathermap.org/data/2.5/weather?zip='+zip.toString()+',us&units=imperial&APPID=2cf2807ad1a80221adce09c988f81580', function(err, response, body){
					var weather = JSON.parse(body);
					callback(null, incidents, weather);
				});
			}
			else
				callback(null, incidents, null);
		},
		function(incidents, weather, callback){
			if(zip){
				request('http://api.openweathermap.org/data/2.5/forecast?zip='+zip.toString()+',us&units=imperial&APPID=2cf2807ad1a80221adce09c988f81580', function(err, response, body) {
					var forecast = JSON.parse(body)['list'];
					callback(null, incidents, weather, forecast);
				});
			}
			else
				callback(null, incidents, weather, null);
		}
	], function(err, incidents, weather, forecast){
		res.render('home', {incidents: incidents, weather: weather, forecast: forecast, locality: locality, correctZip: correctZip});
	});
});

//==================================
//Post Routes
//==================================
app.post('/zip', function(req, res){
	if(Number.isInteger(Number(req.body.zip)) && String(req.body.zip).length == 5){ //correctly formatted zip code
		zip = req.body.zip;
		correctZip = true;
		request('http://dev.virtualearth.net/REST/v1/Locations/zip='+req.body.zip+'?&key=ArLa6JxoMs4uT_XJfS6sgsFm7mXq8HXwvmDblyyBce9V8JMma-csh_6Dj6cnzKRn', function(err, response, body){
		     var tempCoords = JSON.parse(body)['resourceSets'][0]['resources'][0]['bbox'];
		     locality = JSON.parse(body)['resourceSets'][0]['resources'][0]['address']['locality'];
		     coords = "";
			async.eachOf(tempCoords, function(coord, key, callback){
				coords += (String(coord) + (key < 3 ? ',' : '?'));
				callback();
			}, function(err){
				res.redirect('/');
			})
		});
	}
	else{
		correctZip = false;
		res.redirect('/');
	}
});

app.listen(9000, function(){
    console.log('success');
});