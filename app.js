var express     			= require('express'),
    request     			= require('request'),
    bodyParser  			= require('body-parser'),
    async					= require('async'),
    mongoose				= require('mongoose'),
    passport				= require('passport'),
    localStrategy 			= require('passport-local'),
    passportLocalMongoose 	= require('passport-local-mongoose'),
    expressSession			= require('express-session'),
    User					= require('./models/user')
    sources					= require('./public/sources.js');	

//=======================================================
//SET UP APP
//=======================================================
var app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public')); //changes default directory
app.use(expressSession({secret: 'This is a secret sentence', resave: false, saveUninitialized: false})); //creates logged in session
app.use(passport.initialize()); 
app.use(passport.session());

//=======================================================
//SET UP AUTHENTICATION
//=======================================================
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//CONNECT TO DATABASE
mongoose.connect('mongodb://nick:password@ds127993.mlab.com:27993/homepage-');

//====================================
//Global Variables
//====================================
var zip,
	coords,
	address,
	currentUser;

//====================================
//Error Control Variables
//====================================
var	correctZip = true,
	loginSuccess = true,
	signupSuccess = true,
	correctDefaultZip = true;

//====================================
//Home Page
//====================================
app.get('/', function(req, res){
	if(req.isAuthenticated()){ // get info and load home page
		async.waterfall([getTraffic, getWeather, getForecast, getArticles], function(err, incidents, weather, forecast, articles){
			res.render('home', {defaults: Object.keys(currentUser.defaults), currentUser: currentUser, incidents: incidents, weather: weather, forecast: forecast, address: address, correctZip: correctZip, articles: articles});
		});
	}
	else{ //load login page
		res.render('login', {loginSuccess: loginSuccess, currentUser: currentUser});
	}
});

//====================================
//Sign-Up Routes
//====================================
app.get('/signup', function(req, res){
    req.isAuthenticated() ? res.redirect('/') : res.render('signup', {currentUser: currentUser, signupSuccess: signupSuccess});
});

app.post('/signup', function(req, res){
	var defaultObj = {traffic: 'on', weather: 'on', forecast: 'on', spotify: 'on', todos: 'on'};
    User.register(new User({username: req.body.username, defaults: defaultObj, sources: sources}), req.body.password, function(err, user){
        if(!err){
            signupSuccess = true;
            passport.authenticate('local')(req,res, function(){
            	currentUser = user;
                res.redirect('/');
            });
        }
        else{
            signupSuccess = false;
            res.redirect('/signup');
        }
    });
});

//====================================
//Login Routes
//====================================
app.get('/login/false', function(req,res){
   loginSuccess = false;
   res.redirect('/');
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login/false'
}), function(req, res){
	User.findOne({username: req.body.username}, function(err, user){
		loginSuccess = true;
		currentUser = user;
		res.redirect('/useDefaultZip');
	});
});

//====================================
//Logout Route
//====================================
app.get('/logout', function(req, res){
	zip = null;
	coords = null;
	address = null;
	currentUser = null;
    req.logout();
    res.redirect('/');
});

//====================================
//Zip-Code Routes
//====================================
app.get('/useDefaultZip', function(req, res){
	zip = currentUser.zipcode;
	correctZip = true;
	getCoords(zip, res);
});

app.post('/zip', function(req, res){ 
	if(Number.isInteger(Number(req.body.zip)) && String(req.body.zip).length == 5){ //correctly formatted zip code
		zip = req.body.zip;
		correctZip = true;
		getCoords(zip, res);
	}
	else{
		correctZip = false;
		res.redirect('/');
	}
});

//====================================
//Settings Routes
//====================================
app.get('/settings', function(req, res){
	if(req.isAuthenticated())
		res.render('settings', {currentUser: currentUser, correctDefaultZip: correctDefaultZip});
	else
		res.redirect('/');
});

app.post('/settings', function(req, res){
	if(Number.isInteger(Number(req.body.zip)) && req.body.zip.length == 5){ //correctly formatted zip code
		currentUser.zipcode = req.body.zip;
		correctDefaultZip = true;
		currentUser.save(function(err){
			res.redirect('/settings');		
		});
	}
	else{
		correctDefaultZip = false;
		res.redirect('/settings');
	}
});

app.post('/defaults', function(req, res){
	currentUser.defaults = req.body;
	currentUser.save(function(err){
		res.redirect('/settings');
	});
});

app.post('/sources', function(req, res){
	currentUser.sources=[];
	async.each(Object.keys(req.body), function(source, callback){
		currentUser.sources.push(
			sources.find(function(src){
				return src.name == source;
			})
		);
		callback();
	}, function(err){
		currentUser.save(function(err){
			res.redirect('/settings');
		});
	});
});

//====================================
//todo Routes
//====================================
app.post('/newTodo', function(req, res){
	currentUser.todos.push(req.body.todo);
	currentUser.save(function(err){
		res.redirect('/');
	});
});

app.post('/removeTodo', function(req, res){
	currentUser.todos.splice(currentUser.todos.indexOf(req.body.todo), 1);
	currentUser.save(function(err){
		res.redirect('/');
	});
});

//=======================================================
//functions
//=======================================================
function getCoords(zip, res){
	request('http://dev.virtualearth.net/REST/v1/Locations/zip='+zip+'?&key=ArLa6JxoMs4uT_XJfS6sgsFm7mXq8HXwvmDblyyBce9V8JMma-csh_6Dj6cnzKRn', function(err, response, body){
	    var tempCoords = JSON.parse(body)['resourceSets'][0]['resources'][0]['bbox'];
	    address = JSON.parse(body)['resourceSets'][0]['resources'][0]['address'];
	    coords = "";
		async.eachOf(tempCoords, function(coord, key, callback){
			coords += (String(coord) + (key < 3 ? ',' : '?'));
			callback();
		}, function(err){
			res.redirect('/');
		})
	});
}

function getTraffic(callback){
	if(coords){
		request('http://dev.virtualearth.net/REST/v1/Traffic/Incidents/'+coords+'key=ArLa6JxoMs4uT_XJfS6sgsFm7mXq8HXwvmDblyyBce9V8JMma-csh_6Dj6cnzKRn', function(err, response, body){
			var incidents = JSON.parse(body)['resourceSets'][0]['resources'];
			callback(null, incidents);
		});
	}
	else
		callback(null, null);
}

function getWeather(incidents, callback){
	if(zip){
		request('http://api.openweathermap.org/data/2.5/weather?zip='+zip.toString()+',us&units=imperial&APPID=2cf2807ad1a80221adce09c988f81580', function(err, response, body){
			var weather = JSON.parse(body);
			callback(null, incidents, weather);
		});
	}
	else
		callback(null, incidents, null);
}

function getForecast(incidents, weather, callback){
	if(zip){
		request('http://api.openweathermap.org/data/2.5/forecast?zip='+zip.toString()+',us&units=imperial&APPID=2cf2807ad1a80221adce09c988f81580', function(err, response, body) {
			var forecast = JSON.parse(body)['list'];
			callback(null, incidents, weather, forecast);
		});
	}
	else
		callback(null, incidents, weather, null);
}

function getArticles(incidents, weather, forecast, callback){
	var articles = [];
	async.each(currentUser.sources, function(source, callback1){
        request("https://newsapi.org/v1/articles?source=" + source['id'] + "&apiKey=03cfb8dd19714f5287188cccfe3b8f70", function(error, response, body) {
            async.each(JSON.parse(body)['articles'], function(article, callback2){
                articles.push({source: (source['name']), article: article});
                callback2();
            }, function(){
                callback1();
            });
        });
    }, function(){
        articles.sort(function(a,b){
            return new Date(b['article']['publishedAt']) - new Date(a['article']['publishedAt']);
        });
        callback(null, incidents, weather, forecast, articles);
    });
}
//=======================================================
//START SERVER
//=======================================================
app.listen(9000, function(){
    console.log('success');
});