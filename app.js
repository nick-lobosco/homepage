var express     			= require('express'),
    request     			= require('request'),
    bodyParser  			= require('body-parser'),
    async					= require('async'),
    mongoose				= require('mongoose'),
    passport				= require('passport'),
    localStrategy 			= require('passport-local'),
    passportLocalMongoose 	= require('passport-local-mongoose'),
    expressSession			= require('express-session'),
    User					= require('./models/user');			

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
	locality,
	currentUser;

//====================================
//Error Control Variables
//====================================
var	correctZip = true,
	loginSuccess = true,
	signupSuccess = true,
	correctDefaultZip = true;

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
				});
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
		res.render('home', {username: (currentUser? currentUser.username : null), incidents: incidents, weather: weather, forecast: forecast, locality: locality, correctZip: correctZip, todos: (currentUser? currentUser.todos : null)});
	});
});

//SIGNUP PAGE- if user is logged in redirects to account page
app.get('/signup', function(req, res){
    req.isAuthenticated() ? res.redirect('/') : res.render('signup', {signupSuccess: signupSuccess});
});

//TESTS WHETHER LOGIN CREDENTIALS WERE CORRECT - redirects to accounts if login was successful
app.get('/login/:bool', function(req,res){
   loginSuccess = (req.params.bool == 'true');
   loginSuccess ? res.redirect('/') : res.redirect('/login');
});

//LOGIN PAGE- if user is already logged in redirects to account page
app.get('/login', function(req, res){
    req.isAuthenticated() ? res.redirect('/') : res.render('login', {loginSuccess: loginSuccess, username: (currentUser? currentUser.username : null)});
});

//LOGS USER OUT AND REDIRECTS TO HOME
app.get('/logout', function(req, res){
	zip = null;
	coords = null;
	locality = null;
    req.logout();
    res.redirect('/');
});

app.get('/useDefaultZip', function(req, res){
	zip = currentUser.zipcode;
	correctZip = true;
	getCoords(zip, res);
});

app.get('/settings', function(req, res){
	if(req.isAuthenticated())
		res.render('settings', {username: currentUser.username, defaultZip: currentUser.zipcode, correctDefaultZip: correctDefaultZip});
	else
		res.redirect('/');
})
//==================================
//Post Routes
//==================================
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

//CREATES NEW ACCOUNT
app.post('/signup', function(req, res){
    User.register(new User({username: req.body.username}), req.body.password, function(err, user){
        if(!err){
            signupSuccess = true;
            passport.authenticate('local')(req,res, function(){
            	currentUser = user;
                res.redirect('/');
            });
        }
        else{
            signupSuccess = false;
            res.redirect('signup');
        }
    });
});

//LOGS USER IN
app.post('/login', passport.authenticate('local', {
    failureRedirect: '/login/false'
}), function(req, res){
	User.findOne({username: req.body.username}, function(err, user){
		currentUser = user;
		res.redirect('/');
	});
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

app.post('/newTodo', function(req, res){
	currentUser.todos.push(req.body.todo);
	currentUser.save(function(err){
		res.redirect('/');
	});
});

app.post('/removeTodo', function(req, res){
	currentUser.todos.splice(currentUser.todos.indexOf(req.body.todo), 1);
	res.redirect('/');
});

//=======================================================
//functions
//=======================================================
function getCoords(zip, res){
	request('http://dev.virtualearth.net/REST/v1/Locations/zip='+zip+'?&key=ArLa6JxoMs4uT_XJfS6sgsFm7mXq8HXwvmDblyyBce9V8JMma-csh_6Dj6cnzKRn', function(err, response, body){
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

//=======================================================
//START SERVER
//=======================================================
app.listen(9000, function(){
    console.log('success');
});